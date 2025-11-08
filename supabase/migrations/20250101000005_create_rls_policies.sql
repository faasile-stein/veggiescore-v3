-- Row Level Security (RLS) Policies
-- Secure access to tables based on user authentication and roles

-- =====================================================
-- ENABLE RLS ON ALL TABLES
-- =====================================================
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE crawl_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_opt_outs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_restrictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS FOR RLS
-- =====================================================

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user has specific admin role
CREATE OR REPLACE FUNCTION has_admin_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM admin_users
    WHERE user_id = auth.uid()
    AND (role = required_role OR role = 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is restricted
CREATE OR REPLACE FUNCTION is_user_restricted()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_restrictions
    WHERE user_id = auth.uid()
    AND (expires_at IS NULL OR expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- PLACES POLICIES
-- =====================================================

-- Public read access to places
CREATE POLICY "Places are publicly readable"
  ON places FOR SELECT
  USING (true);

-- Admins can do anything
CREATE POLICY "Admins can manage places"
  ON places FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================
-- MENUS & MENU_ITEMS POLICIES
-- =====================================================

-- Public read access to non-archived menus
CREATE POLICY "Menus are publicly readable"
  ON menus FOR SELECT
  USING (archived = false);

-- Public read access to menu items
CREATE POLICY "Menu items are publicly readable"
  ON menu_items FOR SELECT
  USING (true);

-- Admins can manage menus and items
CREATE POLICY "Admins can manage menus"
  ON menus FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage menu items"
  ON menu_items FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================
-- GAMIFICATION POLICIES
-- =====================================================

-- Users can view their own points transactions
CREATE POLICY "Users can view own points"
  ON points_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view their own level
CREATE POLICY "Users can view own level"
  ON user_levels FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view their own badges
CREATE POLICY "Users can view own badges"
  ON user_badges FOR SELECT
  USING (auth.uid() = user_id);

-- Quests are publicly readable
CREATE POLICY "Quests are publicly readable"
  ON quests FOR SELECT
  USING (
    active_from <= NOW()
    AND (expires_at IS NULL OR expires_at > NOW())
  );

-- Users can view their own quest progress
CREATE POLICY "Users can view own quest progress"
  ON user_quests FOR SELECT
  USING (auth.uid() = user_id);

-- Leaderboards are publicly readable
CREATE POLICY "Leaderboards are publicly readable"
  ON leaderboard_cache FOR SELECT
  USING (true);

-- Admins can manage gamification
CREATE POLICY "Admins can manage points"
  ON points_transactions FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can manage quests"
  ON quests FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- =====================================================
-- ADMIN POLICIES
-- =====================================================

-- Admins can view audit logs
CREATE POLICY "Admins can view audit logs"
  ON admin_audit_logs FOR SELECT
  USING (is_admin());

-- Admins can insert audit logs
CREATE POLICY "Admins can insert audit logs"
  ON admin_audit_logs FOR INSERT
  WITH CHECK (is_admin());

-- Admins can manage overrides
CREATE POLICY "Admins can manage overrides"
  ON manual_overrides FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Restaurant claims can be created by anyone
CREATE POLICY "Anyone can create restaurant claims"
  ON restaurant_claims FOR INSERT
  WITH CHECK (true);

-- Restaurant claims can be viewed by creator or admins
CREATE POLICY "Users can view own claims"
  ON restaurant_claims FOR SELECT
  USING (
    claimant_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR is_admin()
  );

-- Admins can manage claims
CREATE POLICY "Admins can manage claims"
  ON restaurant_claims FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Restaurant owners can view their places
CREATE POLICY "Owners can view their restaurants"
  ON restaurant_owners FOR SELECT
  USING (
    owner_email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR is_admin()
  );

-- Opt-outs can be created by anyone
CREATE POLICY "Anyone can create opt-out requests"
  ON restaurant_opt_outs FOR INSERT
  WITH CHECK (true);

-- Admins can view and manage opt-outs
CREATE POLICY "Admins can manage opt-outs"
  ON restaurant_opt_outs FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- User restrictions viewable by admins
CREATE POLICY "Admins can view restrictions"
  ON user_restrictions FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can manage restrictions"
  ON user_restrictions FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admin users viewable by admins
CREATE POLICY "Admins can view admin users"
  ON admin_users FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can manage admin users"
  ON admin_users FOR ALL
  USING (has_admin_role('admin'))
  WITH CHECK (has_admin_role('admin'));

-- =====================================================
-- CRAWLING & PROCESSING POLICIES
-- =====================================================

-- Crawl runs visible to admins
CREATE POLICY "Admins can view crawl runs"
  ON crawl_runs FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can manage crawl runs"
  ON crawl_runs FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Raw artifacts visible to admins
CREATE POLICY "Admins can view raw artifacts"
  ON raw_artifacts FOR SELECT
  USING (is_admin());

-- Jobs visible to admins
CREATE POLICY "Admins can view jobs"
  ON jobs FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can manage jobs"
  ON jobs FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
