-- Alternative Fix: Allow only EPC users to create projects
-- This is more restrictive and aligns with the application's account type logic

-- First, let's create the basic policy for authenticated users
CREATE POLICY "Authenticated users can create projects" 
  ON projects 
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- Note: If you want to restrict to EPC users only, you would need to:
-- 1. Add an account_type field to the auth.users metadata or create a separate user_profiles table
-- 2. Modify this policy to check the account type
-- For now, we're allowing all authenticated users to create projects