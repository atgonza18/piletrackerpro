-- Clear all pile data to allow fresh upload with fixed date parsing
-- Run this in Supabase SQL Editor before re-uploading your Excel data

-- Delete all pile activities (must be deleted first due to foreign key)
DELETE FROM pile_activities;

-- Delete all piles
DELETE FROM piles;

-- Reset auto-increment sequences if needed (optional)
-- This ensures pile IDs start from 1 again
-- ALTER SEQUENCE piles_id_seq RESTART WITH 1;
-- ALTER SEQUENCE pile_activities_id_seq RESTART WITH 1;

-- Verify deletion
SELECT 
  (SELECT COUNT(*) FROM piles) as remaining_piles,
  (SELECT COUNT(*) FROM pile_activities) as remaining_activities;