-- =====================================================
-- ROLLBACK FOR STEP 2: Remove pile_lookup_data RLS policies
-- =====================================================
-- Run this if you need to undo Step 2

DROP POLICY IF EXISTS "Users can view pile lookup data in their projects" ON pile_lookup_data;
DROP POLICY IF EXISTS "Users can insert pile lookup data in their projects" ON pile_lookup_data;
DROP POLICY IF EXISTS "Users can update pile lookup data in their projects" ON pile_lookup_data;
DROP POLICY IF EXISTS "Users can delete pile lookup data in their projects" ON pile_lookup_data;
