-- =====================================================
-- FIX: Add super admin access to preliminary_production RLS policies
-- =====================================================
-- The preliminary_production table RLS policies don't account for super admins.
-- Super admins should be able to view/insert/update/delete all preliminary data.
-- This migration drops and recreates the RLS policies to include super admin checks.
--
-- IMPORTANT: We use is_current_user_super_admin() function instead of direct
-- subqueries on super_admins table to avoid RLS recursion issues that cause
-- 500 Internal Server Errors.
--
-- Run this in Supabase SQL Editor.

-- Drop existing policies (both old and new naming conventions)
DROP POLICY IF EXISTS "Users can view preliminary production data in their projects" ON preliminary_production;
DROP POLICY IF EXISTS "Users can insert preliminary production data in their projects" ON preliminary_production;
DROP POLICY IF EXISTS "Users can update preliminary production data in their projects" ON preliminary_production;
DROP POLICY IF EXISTS "Users can delete preliminary production data in their projects" ON preliminary_production;
DROP POLICY IF EXISTS "Users can view preliminary production data" ON preliminary_production;
DROP POLICY IF EXISTS "Users can insert preliminary production data" ON preliminary_production;
DROP POLICY IF EXISTS "Users can update preliminary production data" ON preliminary_production;
DROP POLICY IF EXISTS "Users can delete preliminary production data" ON preliminary_production;

-- Recreate policies WITH super admin support
-- Uses is_current_user_super_admin() SECURITY DEFINER function to avoid RLS recursion

-- SELECT: Users can view if they're in user_projects OR if they're a super admin
CREATE POLICY "Users can view preliminary production data"
  ON preliminary_production
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_projects
      WHERE user_projects.project_id = preliminary_production.project_id
      AND user_projects.user_id = auth.uid()
    )
    OR is_current_user_super_admin()
  );

-- INSERT: Users can insert if they're in user_projects OR if they're a super admin
CREATE POLICY "Users can insert preliminary production data"
  ON preliminary_production
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_projects
      WHERE user_projects.project_id = preliminary_production.project_id
      AND user_projects.user_id = auth.uid()
    )
    OR is_current_user_super_admin()
  );

-- UPDATE: Users can update if they're in user_projects OR if they're a super admin
CREATE POLICY "Users can update preliminary production data"
  ON preliminary_production
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_projects
      WHERE user_projects.project_id = preliminary_production.project_id
      AND user_projects.user_id = auth.uid()
    )
    OR is_current_user_super_admin()
  );

-- DELETE: Users can delete if they're in user_projects OR if they're a super admin
CREATE POLICY "Users can delete preliminary production data"
  ON preliminary_production
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_projects
      WHERE user_projects.project_id = preliminary_production.project_id
      AND user_projects.user_id = auth.uid()
    )
    OR is_current_user_super_admin()
  );

-- Verify the policies were created
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'preliminary_production';
