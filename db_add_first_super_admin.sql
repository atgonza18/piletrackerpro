-- =====================================================
-- ADD FIRST SUPER ADMIN
-- =====================================================
-- Run this in Supabase SQL Editor to add the first super admin.
-- This bypasses RLS policies which require an existing super admin.
--
-- The RLS policies on super_admins table create a chicken-and-egg problem:
-- only super admins can add super admins. This script solves that for the
-- first super admin.

-- Replace with the email of the user you want to make a super admin
DO $$
DECLARE
  target_email TEXT := 'bandicoot.hg@gmail.com';
  target_user_id UUID;
BEGIN
  -- Find the user ID for the given email
  SELECT id INTO target_user_id
  FROM auth.users
  WHERE email = target_email;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'User with email % not found in auth.users', target_email;
  END IF;

  -- Check if already a super admin
  IF EXISTS (SELECT 1 FROM super_admins WHERE user_id = target_user_id) THEN
    RAISE NOTICE 'User % is already a super admin', target_email;
  ELSE
    -- Insert the super admin record (bypasses RLS when run in SQL Editor)
    INSERT INTO super_admins (user_id, granted_by, granted_at)
    VALUES (target_user_id, target_user_id, NOW());

    RAISE NOTICE 'Successfully added % as super admin', target_email;
  END IF;
END $$;

-- Verify the super admin was added
SELECT
  sa.id,
  sa.user_id,
  u.email,
  sa.granted_at
FROM super_admins sa
JOIN auth.users u ON sa.user_id = u.id;
