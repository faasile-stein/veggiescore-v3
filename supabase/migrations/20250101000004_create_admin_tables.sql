-- Admin & Audit Tables
-- Tables for admin operations, audit logging, and manual overrides

-- =====================================================
-- ADMIN_AUDIT_LOGS TABLE
-- =====================================================
CREATE TABLE admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'edit_menu', 'reprocess', 'ban_user', etc.
  resource_type TEXT, -- 'place', 'menu', 'menu_item', 'user'
  resource_id UUID,
  before JSONB,
  after JSONB,
  reason TEXT,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_admin_audit_logs_admin_id ON admin_audit_logs(admin_id);
CREATE INDEX idx_admin_audit_logs_created_at ON admin_audit_logs(created_at DESC);
CREATE INDEX idx_admin_audit_logs_resource ON admin_audit_logs(resource_type, resource_id);

-- Comments
COMMENT ON TABLE admin_audit_logs IS 'Audit trail for all admin actions';

-- =====================================================
-- MANUAL_OVERRIDES TABLE
-- =====================================================
CREATE TABLE manual_overrides (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  field TEXT NOT NULL, -- 'name', 'price', 'dietary_labels', etc.
  original_value JSONB,
  override_value JSONB,
  admin_id UUID REFERENCES auth.users(id),
  reason TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_manual_overrides_menu_item_id ON manual_overrides(menu_item_id);
CREATE INDEX idx_manual_overrides_admin_id ON manual_overrides(admin_id);

-- Comments
COMMENT ON TABLE manual_overrides IS 'Manual corrections to parsed menu data';

-- =====================================================
-- RESTAURANT_CLAIMS TABLE
-- =====================================================
CREATE TABLE restaurant_claims (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  claimant_email TEXT NOT NULL,
  verification_token TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'verified', 'approved', 'rejected'
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (status IN ('pending', 'verified', 'approved', 'rejected'))
);

-- Indexes
CREATE INDEX idx_restaurant_claims_place_id ON restaurant_claims(place_id);
CREATE INDEX idx_restaurant_claims_status ON restaurant_claims(status);
CREATE INDEX idx_restaurant_claims_token ON restaurant_claims(verification_token);

-- Comments
COMMENT ON TABLE restaurant_claims IS 'Restaurant ownership claim requests';

-- =====================================================
-- RESTAURANT_OWNERS TABLE
-- =====================================================
CREATE TABLE restaurant_owners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  owner_email TEXT NOT NULL,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(place_id, owner_email)
);

-- Indexes
CREATE INDEX idx_restaurant_owners_place_id ON restaurant_owners(place_id);
CREATE INDEX idx_restaurant_owners_email ON restaurant_owners(owner_email);

-- Comments
COMMENT ON TABLE restaurant_owners IS 'Verified restaurant owners with special permissions';

-- =====================================================
-- RESTAURANT_OPT_OUTS TABLE
-- =====================================================
CREATE TABLE restaurant_opt_outs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  place_id UUID NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  requester_email TEXT NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Indexes
CREATE INDEX idx_restaurant_opt_outs_place_id ON restaurant_opt_outs(place_id);
CREATE INDEX idx_restaurant_opt_outs_status ON restaurant_opt_outs(status);

-- Comments
COMMENT ON TABLE restaurant_opt_outs IS 'Restaurant opt-out requests from crawling';

-- =====================================================
-- USER_RESTRICTIONS TABLE
-- =====================================================
CREATE TABLE user_restrictions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  restriction_type TEXT NOT NULL, -- 'ban', 'suspension', 'rate_limit'
  reason TEXT NOT NULL,
  expires_at TIMESTAMPTZ, -- NULL for permanent
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (restriction_type IN ('ban', 'suspension', 'rate_limit'))
);

-- Indexes
CREATE INDEX idx_user_restrictions_user_id ON user_restrictions(user_id);
CREATE INDEX idx_user_restrictions_active ON user_restrictions(user_id, expires_at)
  WHERE expires_at IS NULL OR expires_at > NOW();

-- Comments
COMMENT ON TABLE user_restrictions IS 'User bans, suspensions, and restrictions';

-- =====================================================
-- ADMIN_USERS TABLE
-- =====================================================
CREATE TABLE admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'admin', 'moderator', 'content_editor', 'data_ops'
  granted_by UUID REFERENCES auth.users(id),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (role IN ('admin', 'moderator', 'content_editor', 'data_ops'))
);

-- Index
CREATE INDEX idx_admin_users_role ON admin_users(role);

-- Comments
COMMENT ON TABLE admin_users IS 'Admin users with role-based access control';
