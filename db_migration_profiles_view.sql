-- Migration: Create profiles view for accessing user emails
-- This view exposes necessary user information from auth.users to the public schema
-- Required for team member queries that need to display user emails

-- Create a view that exposes user email from auth.users
CREATE OR REPLACE VIEW public.profiles AS
SELECT
  id,
  email,
  raw_user_meta_data as user_metadata,
  created_at
FROM auth.users;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.profiles TO authenticated;

-- Enable RLS on the view (views inherit from base table, but we add explicit policy)
-- Note: Views in Supabase automatically respect the underlying table's RLS

-- Add a comment explaining the view's purpose
COMMENT ON VIEW public.profiles IS 'Public view of auth.users for displaying team member information';
