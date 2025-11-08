-- Seed Data for Development and Testing
-- This file contains sample data for local development

-- =====================================================
-- SAMPLE PLACES
-- =====================================================
INSERT INTO places (
  google_place_id,
  name,
  address,
  location,
  website,
  phone,
  cuisine_types,
  price_level,
  rating,
  veggie_score
) VALUES
(
  'ChIJexample1',
  'Green Leaf Cafe',
  '123 Main St, San Francisco, CA 94102',
  ST_GeogFromText('POINT(-122.4194 37.7749)'),
  'https://greenleafcafe.example.com',
  '+1-415-555-0101',
  ARRAY['Vegan', 'Vegetarian', 'Healthy'],
  2,
  4.5,
  95
),
(
  'ChIJexample2',
  'The Omnivore Kitchen',
  '456 Market St, San Francisco, CA 94103',
  ST_GeogFromText('POINT(-122.4084 37.7858)'),
  'https://omnivorekitchen.example.com',
  '+1-415-555-0102',
  ARRAY['American', 'Comfort Food'],
  3,
  4.2,
  45
),
(
  'ChIJexample3',
  'Plant Power',
  '789 Valencia St, San Francisco, CA 94110',
  ST_GeogFromText('POINT(-122.4216 37.7599)'),
  'https://plantpower.example.com',
  '+1-415-555-0103',
  ARRAY['Vegan', 'Raw', 'Juice Bar'],
  2,
  4.8,
  100
);

-- =====================================================
-- SAMPLE ADMIN USER (for local development)
-- =====================================================
-- Note: This assumes you have a user in auth.users
-- You'll need to manually add this after creating a user:
-- INSERT INTO admin_users (user_id, role, granted_by)
-- VALUES ('<your-user-id>', 'admin', '<your-user-id>');

-- =====================================================
-- SAMPLE QUESTS
-- =====================================================
INSERT INTO quests (
  title,
  description,
  quest_type,
  rules,
  reward_points,
  expires_at
) VALUES
(
  'Daily Explorer',
  'Discover 1 new restaurant today',
  'daily',
  '{"action": "discover_place", "count": 1}'::jsonb,
  75,
  NOW() + INTERVAL '1 day'
),
(
  'Weekend Warrior',
  'Discover 5 restaurants this week',
  'weekly',
  '{"action": "discover_place", "count": 5}'::jsonb,
  500,
  NOW() + INTERVAL '7 days'
),
(
  'Menu Maven',
  'Upload 3 menu photos',
  'weekly',
  '{"action": "upload_menu", "count": 3}'::jsonb,
  300,
  NOW() + INTERVAL '7 days'
);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to compute VeggieScore for a place
CREATE OR REPLACE FUNCTION compute_veggie_score(p_place_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_total_items INTEGER;
  v_vegan_items INTEGER;
  v_vegetarian_items INTEGER;
  v_score INTEGER;
BEGIN
  -- Count total items
  SELECT COUNT(*)
  INTO v_total_items
  FROM menu_items mi
  JOIN menus m ON m.id = mi.menu_id
  WHERE m.place_id = p_place_id
    AND m.archived = false;

  -- Return NULL if no items
  IF v_total_items = 0 THEN
    RETURN NULL;
  END IF;

  -- Count vegan items
  SELECT COUNT(*)
  INTO v_vegan_items
  FROM menu_items mi
  JOIN menus m ON m.id = mi.menu_id
  WHERE m.place_id = p_place_id
    AND m.archived = false
    AND 'vegan' = ANY(mi.dietary_labels);

  -- Count vegetarian items (excluding vegan)
  SELECT COUNT(*)
  INTO v_vegetarian_items
  FROM menu_items mi
  JOIN menus m ON m.id = mi.menu_id
  WHERE m.place_id = p_place_id
    AND m.archived = false
    AND 'vegetarian' = ANY(mi.dietary_labels)
    AND NOT ('vegan' = ANY(mi.dietary_labels));

  -- Calculate score: vegan items = 100%, vegetarian = 50%
  v_score := ROUND(
    ((v_vegan_items::FLOAT / v_total_items) * 100) +
    ((v_vegetarian_items::FLOAT / v_total_items) * 50)
  );

  -- Cap at 100
  v_score := LEAST(v_score, 100);

  -- Update place
  UPDATE places
  SET veggie_score = v_score,
      updated_at = NOW()
  WHERE id = p_place_id;

  RETURN v_score;
END;
$$ LANGUAGE plpgsql;

-- Function to award points to a user
CREATE OR REPLACE FUNCTION award_points(
  p_user_id UUID,
  p_points INTEGER,
  p_reason TEXT,
  p_related_type TEXT DEFAULT NULL,
  p_related_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
BEGIN
  -- Check if user is restricted
  IF EXISTS (
    SELECT 1 FROM user_restrictions
    WHERE user_id = p_user_id
    AND restriction_type = 'ban'
    AND (expires_at IS NULL OR expires_at > NOW())
  ) THEN
    RAISE EXCEPTION 'User is banned and cannot receive points';
  END IF;

  -- Insert points transaction
  INSERT INTO points_transactions (
    user_id,
    points,
    reason,
    related_type,
    related_id,
    metadata
  ) VALUES (
    p_user_id,
    p_points,
    p_reason,
    p_related_type,
    p_related_id,
    p_metadata
  )
  RETURNING id INTO v_transaction_id;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get leaderboard
CREATE OR REPLACE FUNCTION get_leaderboard(
  p_scope TEXT DEFAULT 'global',
  p_timeframe TEXT DEFAULT 'all_time',
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  rank BIGINT,
  user_id UUID,
  total_points BIGINT,
  level TEXT
) AS $$
DECLARE
  v_start_date TIMESTAMPTZ;
BEGIN
  -- Determine start date based on timeframe
  v_start_date := CASE p_timeframe
    WHEN 'daily' THEN NOW() - INTERVAL '1 day'
    WHEN 'weekly' THEN NOW() - INTERVAL '7 days'
    WHEN 'monthly' THEN NOW() - INTERVAL '30 days'
    ELSE '1970-01-01'::TIMESTAMPTZ -- all_time
  END;

  -- Return leaderboard
  RETURN QUERY
  SELECT
    ROW_NUMBER() OVER (ORDER BY SUM(pt.points) DESC) as rank,
    pt.user_id,
    SUM(pt.points) as total_points,
    COALESCE(ul.level, 'bronze') as level
  FROM points_transactions pt
  LEFT JOIN user_levels ul ON ul.user_id = pt.user_id
  WHERE pt.created_at >= v_start_date
  GROUP BY pt.user_id, ul.level
  ORDER BY total_points DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION compute_veggie_score IS 'Compute VeggieScore for a place based on menu items';
COMMENT ON FUNCTION award_points IS 'Award points to a user for an action';
COMMENT ON FUNCTION get_leaderboard IS 'Get leaderboard for a scope and timeframe';
