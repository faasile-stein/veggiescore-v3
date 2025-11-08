-- Gamification Tables
-- Tables for points, levels, badges, quests, and leaderboards

-- =====================================================
-- POINTS_TRANSACTIONS TABLE
-- =====================================================
CREATE TABLE points_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL, -- 'discover_place', 'upload_menu', 'verified_review', etc.
  related_type TEXT, -- 'place', 'menu', 'review', 'quest'
  related_id UUID,
  multiplier DECIMAL(3,2) DEFAULT 1.0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_points_transactions_user_id ON points_transactions(user_id);
CREATE INDEX idx_points_transactions_created_at ON points_transactions(created_at DESC);
CREATE INDEX idx_points_transactions_reason ON points_transactions(reason);

-- Comments
COMMENT ON TABLE points_transactions IS 'Record of all point awards and deductions';
COMMENT ON COLUMN points_transactions.multiplier IS 'Point multiplier for special events (e.g., 2x weekend)';

-- =====================================================
-- USER_LEVELS TABLE
-- =====================================================
CREATE TABLE user_levels (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  level TEXT NOT NULL DEFAULT 'bronze', -- 'bronze', 'silver', 'gold', 'platinum'
  total_points INTEGER DEFAULT 0,
  level_achieved_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (level IN ('bronze', 'silver', 'gold', 'platinum'))
);

-- Index
CREATE INDEX idx_user_levels_total_points ON user_levels(total_points DESC);

-- Comments
COMMENT ON TABLE user_levels IS 'User level and total points tracking';

-- =====================================================
-- USER_BADGES TABLE
-- =====================================================
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  badge_type TEXT NOT NULL, -- 'first_discover', 'menu_maven', 'night_owl', etc.
  badge_tier TEXT, -- 'bronze', 'silver', 'gold' (NULL for non-tiered badges)
  metadata JSONB DEFAULT '{}'::jsonb, -- badge-specific data
  awarded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_type, badge_tier)
);

-- Indexes
CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
CREATE INDEX idx_user_badges_badge_type ON user_badges(badge_type);

-- Comments
COMMENT ON TABLE user_badges IS 'User achievement badges';

-- =====================================================
-- QUESTS TABLE
-- =====================================================
CREATE TABLE quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  quest_type TEXT NOT NULL, -- 'daily', 'weekly', 'special'
  rules JSONB NOT NULL, -- { action: 'upload_menu', count: 3, filter: {...} }
  reward_points INTEGER NOT NULL,
  reward_badge TEXT,
  active_from TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (quest_type IN ('daily', 'weekly', 'special'))
);

-- Indexes
CREATE INDEX idx_quests_active ON quests(active_from, expires_at) WHERE expires_at IS NULL OR expires_at > NOW();
CREATE INDEX idx_quests_type ON quests(quest_type);

-- Comments
COMMENT ON TABLE quests IS 'Quest definitions (daily, weekly, special challenges)';

-- =====================================================
-- USER_QUESTS TABLE
-- =====================================================
CREATE TABLE user_quests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quest_id UUID NOT NULL REFERENCES quests(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active', -- 'active', 'completed', 'expired'
  progress JSONB DEFAULT '{}'::jsonb, -- { uploads: 2, target: 3 }
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, quest_id),
  CHECK (status IN ('active', 'completed', 'expired'))
);

-- Indexes
CREATE INDEX idx_user_quests_user_id_status ON user_quests(user_id, status);
CREATE INDEX idx_user_quests_quest_id ON user_quests(quest_id);

-- Comments
COMMENT ON TABLE user_quests IS 'User quest progress tracking';

-- =====================================================
-- LEADERBOARD_CACHE TABLE
-- =====================================================
CREATE TABLE leaderboard_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scope TEXT NOT NULL, -- 'global', 'city:NYC', 'friends:user_id'
  timeframe TEXT NOT NULL, -- 'daily', 'weekly', 'monthly', 'all_time'
  payload JSONB NOT NULL, -- [{ user_id, username, points, rank }]
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(scope, timeframe)
);

-- Index
CREATE INDEX idx_leaderboard_cache_updated ON leaderboard_cache(updated_at DESC);

-- Comments
COMMENT ON TABLE leaderboard_cache IS 'Cached leaderboard data for performance';

-- =====================================================
-- TRIGGERS
-- =====================================================
CREATE TRIGGER update_user_levels_updated_at BEFORE UPDATE ON user_levels
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update user total points when points are awarded
CREATE OR REPLACE FUNCTION update_user_total_points()
RETURNS TRIGGER AS $$
BEGIN
    -- Update or insert user_levels
    INSERT INTO user_levels (user_id, total_points)
    VALUES (NEW.user_id, NEW.points)
    ON CONFLICT (user_id) DO UPDATE
    SET total_points = user_levels.total_points + NEW.points,
        updated_at = NOW();

    -- Check for level up
    UPDATE user_levels
    SET
        level = CASE
            WHEN total_points >= 20000 THEN 'platinum'
            WHEN total_points >= 5000 THEN 'gold'
            WHEN total_points >= 1000 THEN 'silver'
            ELSE 'bronze'
        END,
        level_achieved_at = CASE
            WHEN level != CASE
                WHEN total_points >= 20000 THEN 'platinum'
                WHEN total_points >= 5000 THEN 'gold'
                WHEN total_points >= 1000 THEN 'silver'
                ELSE 'bronze'
            END THEN NOW()
            ELSE level_achieved_at
        END
    WHERE user_id = NEW.user_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_total_points AFTER INSERT ON points_transactions
    FOR EACH ROW EXECUTE FUNCTION update_user_total_points();
