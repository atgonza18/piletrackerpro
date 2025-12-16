-- Migration: Add daily pile goal column to projects table
-- This allows users to set a daily production target for tracking progress

-- Add the daily_pile_goal column to the projects table
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS daily_pile_goal INTEGER DEFAULT NULL;

-- Add a comment to document the column
COMMENT ON COLUMN projects.daily_pile_goal IS 'Daily production target for pile installations. Can be updated as schedule changes.';

-- Note: No RLS changes needed as the column inherits existing projects table policies
