-- =====================================================
-- SUPER ADMIN SYSTEM - STEP 2: Add RLS policies for pile_lookup_data
-- =====================================================
-- The pile_lookup_data table has RLS enabled but NO policies defined.
-- This means nobody can currently access it (which is probably a bug).
-- This step adds proper RLS policies for regular users.
-- Safe to run - adds missing functionality.

-- RLS Policy: Users can view pile lookup data for their projects
CREATE POLICY "Users can view pile lookup data in their projects"
  ON pile_lookup_data
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_projects
    WHERE user_projects.project_id = pile_lookup_data.project_id
    AND user_projects.user_id = auth.uid()
  ));

-- RLS Policy: Users can insert pile lookup data for their projects
CREATE POLICY "Users can insert pile lookup data in their projects"
  ON pile_lookup_data
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_projects
    WHERE user_projects.project_id = pile_lookup_data.project_id
    AND user_projects.user_id = auth.uid()
  ));

-- RLS Policy: Users can update pile lookup data in their projects
CREATE POLICY "Users can update pile lookup data in their projects"
  ON pile_lookup_data
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_projects
    WHERE user_projects.project_id = pile_lookup_data.project_id
    AND user_projects.user_id = auth.uid()
  ));

-- RLS Policy: Users can delete pile lookup data in their projects
CREATE POLICY "Users can delete pile lookup data in their projects"
  ON pile_lookup_data
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM user_projects
    WHERE user_projects.project_id = pile_lookup_data.project_id
    AND user_projects.user_id = auth.uid()
  ));

COMMENT ON POLICY "Users can view pile lookup data in their projects" ON pile_lookup_data IS 'Allows users to view pile lookup data for projects they are members of';
