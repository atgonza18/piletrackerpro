-- =====================================================
-- ROLLBACK FOR STEP 1: Remove super_admins table
-- =====================================================
-- Run this if you need to undo Step 1

-- Drop the helper functions
DROP FUNCTION IF EXISTS is_current_user_super_admin();
DROP FUNCTION IF EXISTS is_super_admin(UUID);

-- Drop the table (will cascade and remove policies/triggers)
DROP TABLE IF EXISTS super_admins CASCADE;
