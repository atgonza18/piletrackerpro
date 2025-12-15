-- =====================================================
-- SUPER ADMIN SYSTEM - STEP 3 SAFE: Update existing RLS policies only
-- =====================================================
-- This version ONLY updates tables that definitely exist.
-- We're skipping pile_lookup_data since it may not exist in your database.
--
-- Pattern: is_current_user_super_admin() OR (existing condition)

-- =====================================================
-- PROJECTS TABLE POLICIES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view projects they are part of" ON projects;
DROP POLICY IF EXISTS "Project owners can update their projects" ON projects;

-- Recreate with super admin access
CREATE POLICY "Users can view projects they are part of"
  ON projects
  FOR SELECT
  USING (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM user_projects
      WHERE user_projects.project_id = projects.id
      AND user_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can update their projects"
  ON projects
  FOR UPDATE
  USING (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM user_projects
      WHERE user_projects.project_id = projects.id
      AND user_projects.user_id = auth.uid()
      AND user_projects.is_owner = TRUE
    )
  );

-- Super admins can delete any project
CREATE POLICY "Super admins can delete any project"
  ON projects
  FOR DELETE
  USING (is_current_user_super_admin());

-- =====================================================
-- USER_PROJECTS TABLE POLICIES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their project associations" ON user_projects;
DROP POLICY IF EXISTS "Project owners can insert new user associations" ON user_projects;

-- Recreate with super admin access
CREATE POLICY "Users can view their project associations"
  ON user_projects
  FOR SELECT
  USING (
    is_current_user_super_admin()
    OR user_id = auth.uid()
  );

CREATE POLICY "Project owners can insert new user associations"
  ON user_projects
  FOR INSERT
  WITH CHECK (
    is_current_user_super_admin()
    OR (
      EXISTS (
        SELECT 1 FROM user_projects
        WHERE user_projects.project_id = NEW.project_id
        AND user_projects.user_id = auth.uid()
        AND user_projects.is_owner = TRUE
      )
      OR NEW.user_id = auth.uid()
    )
  );

-- Super admins can update any user-project association
CREATE POLICY "Super admins can update user project associations"
  ON user_projects
  FOR UPDATE
  USING (is_current_user_super_admin());

-- Super admins can delete any user-project association
CREATE POLICY "Super admins can delete user project associations"
  ON user_projects
  FOR DELETE
  USING (is_current_user_super_admin());

-- =====================================================
-- PILES TABLE POLICIES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view piles in their projects" ON piles;
DROP POLICY IF EXISTS "Users can insert piles in their projects" ON piles;
DROP POLICY IF EXISTS "Users can update piles in their projects" ON piles;

-- Recreate with super admin access
CREATE POLICY "Users can view piles in their projects"
  ON piles
  FOR SELECT
  USING (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM user_projects
      WHERE user_projects.project_id = piles.project_id
      AND user_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert piles in their projects"
  ON piles
  FOR INSERT
  WITH CHECK (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM user_projects
      WHERE user_projects.project_id = NEW.project_id
      AND user_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update piles in their projects"
  ON piles
  FOR UPDATE
  USING (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM user_projects
      WHERE user_projects.project_id = piles.project_id
      AND user_projects.user_id = auth.uid()
    )
  );

-- Super admins can delete any pile
CREATE POLICY "Super admins can delete any pile"
  ON piles
  FOR DELETE
  USING (is_current_user_super_admin());

-- =====================================================
-- PILE_ACTIVITIES TABLE POLICIES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view pile activities in their projects" ON pile_activities;
DROP POLICY IF EXISTS "Users can insert pile activities in their projects" ON pile_activities;

-- Recreate with super admin access
CREATE POLICY "Users can view pile activities in their projects"
  ON pile_activities
  FOR SELECT
  USING (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM piles
      JOIN user_projects ON piles.project_id = user_projects.project_id
      WHERE pile_activities.pile_id = piles.id
      AND user_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert pile activities in their projects"
  ON pile_activities
  FOR INSERT
  WITH CHECK (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM piles
      JOIN user_projects ON piles.project_id = user_projects.project_id
      WHERE NEW.pile_id = piles.id
      AND user_projects.user_id = auth.uid()
    )
  );

-- Super admins can update any pile activity
CREATE POLICY "Super admins can update any pile activity"
  ON pile_activities
  FOR UPDATE
  USING (is_current_user_super_admin());

-- Super admins can delete any pile activity
CREATE POLICY "Super admins can delete any pile activity"
  ON pile_activities
  FOR DELETE
  USING (is_current_user_super_admin());

-- =====================================================
-- PROJECT_INVITATIONS TABLE POLICIES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view invitations they sent" ON project_invitations;
DROP POLICY IF EXISTS "Users can view invitations for their projects" ON project_invitations;
DROP POLICY IF EXISTS "Users can create invitations for their projects" ON project_invitations;
DROP POLICY IF EXISTS "Users can update invitations they sent" ON project_invitations;

-- Recreate with super admin access
CREATE POLICY "Users can view invitations they sent"
  ON project_invitations
  FOR SELECT
  USING (
    is_current_user_super_admin()
    OR invited_by = auth.uid()
  );

CREATE POLICY "Users can view invitations for their projects"
  ON project_invitations
  FOR SELECT
  USING (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM user_projects
      WHERE user_projects.project_id = project_invitations.project_id
      AND user_projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create invitations for their projects"
  ON project_invitations
  FOR INSERT
  WITH CHECK (
    is_current_user_super_admin()
    OR EXISTS (
      SELECT 1 FROM user_projects
      WHERE user_projects.project_id = project_invitations.project_id
      AND user_projects.user_id = auth.uid()
      AND (user_projects.is_owner = TRUE OR user_projects.role = 'Admin')
    )
  );

CREATE POLICY "Users can update invitations they sent"
  ON project_invitations
  FOR UPDATE
  USING (
    is_current_user_super_admin()
    OR invited_by = auth.uid()
  );

-- Super admins can delete any invitation
CREATE POLICY "Super admins can delete any invitation"
  ON project_invitations
  FOR DELETE
  USING (is_current_user_super_admin());

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Super admin RLS policies updated successfully!';
END $$;
