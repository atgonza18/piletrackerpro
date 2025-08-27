-- Fix: Add missing INSERT policy for projects table
-- This allows authenticated users to create new projects

CREATE POLICY "Authenticated users can create projects" 
  ON projects 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);