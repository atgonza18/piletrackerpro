-- Final fix for project creation issues
-- This ensures all necessary policies exist for project creation

-- First, drop any existing conflicting policies to avoid duplicates
DROP POLICY IF EXISTS "Authenticated users can create projects" ON projects;
DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;

-- Create a single, clear INSERT policy for projects
CREATE POLICY "Users can create projects" ON projects
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- Ensure the embedment_tolerance column exists with a default value
ALTER TABLE IF EXISTS projects 
ADD COLUMN IF NOT EXISTS embedment_tolerance FLOAT DEFAULT 1.0;

-- Add the name column if it doesn't exist (for backward compatibility)
-- Note: This might already exist, but adding IF NOT EXISTS for safety
ALTER TABLE IF EXISTS projects 
ADD COLUMN IF NOT EXISTS name TEXT;

-- If the name column was just added, populate it from project_name for existing records
UPDATE projects SET name = project_name WHERE name IS NULL;

-- Make name column NOT NULL after populating it
ALTER TABLE projects ALTER COLUMN name SET NOT NULL;