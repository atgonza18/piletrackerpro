-- Migration to rename 'zone' column to 'pile_type' in piles table
-- Also updates the pile_lookup_data table to use 'pile_type' instead of 'zone_type'

-- 1. Rename column in piles table
ALTER TABLE IF EXISTS piles
RENAME COLUMN zone TO pile_type;

-- 2. Rename column in pile_lookup_data table
ALTER TABLE IF EXISTS pile_lookup_data
RENAME COLUMN zone_type TO pile_type;

-- Add comment to explain the column
COMMENT ON COLUMN piles.pile_type IS 'The type/classification of the pile (e.g., "2A2B.INTARRAY", "2A2B.INTSEISMIC")';
COMMENT ON COLUMN pile_lookup_data.pile_type IS 'The type/classification of the pile from the pile plot reference data';
