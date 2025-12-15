-- =====================================================
-- ROLLBACK FOR STEP 3: Restore original RLS policies
-- =====================================================
-- This script restores all RLS policies to their original state
-- Run this if Step 3 causes any issues

-- =====================================================
-- PROJECTS TABLE - Restore original policies
-- =====================================================
DROP POLICY IF EXISTS "Users can view projects they are part of" ON projects;
DROP POLICY IF EXISTS "Project owners can update their projects" ON projects;
DROP POLICY IF EXISTS "Super admins can delete any project" ON projects;

CREATE POLICY "Users can view projects they are part of"
  ON projects
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_projects
    WHERE user_projects.project_id = projects.id
    AND user_projects.user_id = auth.uid()
  ));

CREATE POLICY "Project owners can update their projects"
  ON projects
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_projects
    WHERE user_projects.project_id = projects.id
    AND user_projects.user_id = auth.uid()
    AND user_projects.is_owner = TRUE
  ));

-- =====================================================
-- USER_PROJECTS TABLE - Restore original policies
-- =====================================================
DROP POLICY IF EXISTS "Users can view their project associations" ON user_projects;
DROP POLICY IF EXISTS "Project owners can insert new user associations" ON user_projects;
DROP POLICY IF EXISTS "Super admins can update user project associations" ON user_projects;
DROP POLICY IF EXISTS "Super admins can delete user project associations" ON user_projects;

CREATE POLICY "Users can view their project associations"
  ON user_projects
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Project owners can insert new user associations"
  ON user_projects
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_projects
    WHERE user_projects.project_id = NEW.project_id
    AND user_projects.user_id = auth.uid()
    AND user_projects.is_owner = TRUE
  ) OR NEW.user_id = auth.uid());

-- =====================================================
-- PILES TABLE - Restore original policies
-- =====================================================
DROP POLICY IF EXISTS "Users can view piles in their projects" ON piles;
DROP POLICY IF EXISTS "Users can insert piles in their projects" ON piles;
DROP POLICY IF EXISTS "Users can update piles in their projects" ON piles;
DROP POLICY IF EXISTS "Super admins can delete any pile" ON piles;

CREATE POLICY "Users can view piles in their projects"
  ON piles
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_projects
    WHERE user_projects.project_id = piles.project_id
    AND user_projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert piles in their projects"
  ON piles
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_projects
    WHERE user_projects.project_id = NEW.project_id
    AND user_projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update piles in their projects"
  ON piles
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_projects
    WHERE user_projects.project_id = piles.project_id
    AND user_projects.user_id = auth.uid()
  ));

-- =====================================================
-- PILE_ACTIVITIES TABLE - Restore original policies
-- =====================================================
DROP POLICY IF EXISTS "Users can view pile activities in their projects" ON pile_activities;
DROP POLICY IF EXISTS "Users can insert pile activities in their projects" ON pile_activities;
DROP POLICY IF EXISTS "Super admins can update any pile activity" ON pile_activities;
DROP POLICY IF EXISTS "Super admins can delete any pile activity" ON pile_activities;

CREATE POLICY "Users can view pile activities in their projects"
  ON pile_activities
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM piles
    JOIN user_projects ON piles.project_id = user_projects.project_id
    WHERE pile_activities.pile_id = piles.id
    AND user_projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert pile activities in their projects"
  ON pile_activities
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM piles
    JOIN user_projects ON piles.project_id = user_projects.project_id
    WHERE NEW.pile_id = piles.id
    AND user_projects.user_id = auth.uid()
  ));

-- =====================================================
-- PROJECT_INVITATIONS TABLE - Restore original policies
-- =====================================================
DROP POLICY IF EXISTS "Users can view invitations they sent" ON project_invitations;
DROP POLICY IF EXISTS "Users can view invitations for their projects" ON project_invitations;
DROP POLICY IF EXISTS "Users can create invitations for their projects" ON project_invitations;
DROP POLICY IF EXISTS "Users can update invitations they sent" ON project_invitations;
DROP POLICY IF EXISTS "Super admins can delete any invitation" ON project_invitations;

CREATE POLICY "Users can view invitations they sent"
  ON project_invitations
  FOR SELECT
  USING (invited_by = auth.uid());

CREATE POLICY "Users can view invitations for their projects"
  ON project_invitations
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_projects
    WHERE user_projects.project_id = project_invitations.project_id
    AND user_projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create invitations for their projects"
  ON project_invitations
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_projects
    WHERE user_projects.project_id = project_invitations.project_id
    AND user_projects.user_id = auth.uid()
    AND (user_projects.is_owner = TRUE OR user_projects.role = 'Admin')
  ));

CREATE POLICY "Users can update invitations they sent"
  ON project_invitations
  FOR UPDATE
  USING (invited_by = auth.uid());

-- =====================================================
-- PILE_LOOKUP_DATA TABLE - Restore Step 2 policies
-- =====================================================
DROP POLICY IF EXISTS "Users can view pile lookup data in their projects" ON pile_lookup_data;
DROP POLICY IF EXISTS "Users can insert pile lookup data in their projects" ON pile_lookup_data;
DROP POLICY IF EXISTS "Users can update pile lookup data in their projects" ON pile_lookup_data;
DROP POLICY IF EXISTS "Users can delete pile lookup data in their projects" ON pile_lookup_data;

CREATE POLICY "Users can view pile lookup data in their projects"
  ON pile_lookup_data
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_projects
    WHERE user_projects.project_id = pile_lookup_data.project_id
    AND user_projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can insert pile lookup data in their projects"
  ON pile_lookup_data
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_projects
    WHERE user_projects.project_id = NEW.project_id
    AND user_projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update pile lookup data in their projects"
  ON pile_lookup_data
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_projects
    WHERE user_projects.project_id = pile_lookup_data.project_id
    AND user_projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete pile lookup data in their projects"
  ON pile_lookup_data
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM user_projects
    WHERE user_projects.project_id = pile_lookup_data.project_id
    AND user_projects.user_id = auth.uid()
  ));
