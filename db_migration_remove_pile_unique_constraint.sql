-- Migration to remove unique constraint on (project_id, pile_number)
-- This allows duplicate pile numbers within a project, which is needed for:
-- 1. The duplicate comparison feature where users can compare multiple entries for the same pile
-- 2. Tracking historical data where the same pile may be recorded multiple times

ALTER TABLE piles DROP CONSTRAINT IF EXISTS piles_project_id_pile_number_key;

COMMENT ON TABLE piles IS 'Stores pile data with CSV import functionality. Allows duplicate pile_number values for comparison and historical tracking.';
