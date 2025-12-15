-- =====================================================
-- SUPER ADMIN SYSTEM - STEP 1: Create super_admins table
-- =====================================================
-- This is a safe first step that just creates a table to track super admins.
-- It does NOT modify any existing RLS policies or tables.
-- Safe to run - this won't break anything existing.

-- Create super_admins table
CREATE TABLE IF NOT EXISTS super_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_super_admins_user_id ON super_admins(user_id);

-- Enable RLS on super_admins table
ALTER TABLE super_admins ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Super admins can view all super admin records
CREATE POLICY "Super admins can view super admin list"
  ON super_admins
  FOR SELECT
  USING (
    user_id IN (SELECT user_id FROM super_admins)
  );

-- RLS Policy: Super admins can grant super admin to others
CREATE POLICY "Super admins can grant super admin access"
  ON super_admins
  FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT user_id FROM super_admins)
  );

-- RLS Policy: Super admins can revoke super admin access
CREATE POLICY "Super admins can revoke super admin access"
  ON super_admins
  FOR DELETE
  USING (
    auth.uid() IN (SELECT user_id FROM super_admins)
  );

-- Add trigger for updated_at
CREATE TRIGGER update_super_admins_updated_at
  BEFORE UPDATE ON super_admins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Helper function to check if a user is a super admin
CREATE OR REPLACE FUNCTION is_super_admin(check_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM super_admins WHERE user_id = check_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if current user is a super admin
CREATE OR REPLACE FUNCTION is_current_user_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM super_admins WHERE user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE super_admins IS 'Tracks users with super admin privileges who can access all projects and manage all users';
