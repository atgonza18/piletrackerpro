-- Migration to add pile_location column to piles table
-- This column stores the location/address information for each pile

ALTER TABLE IF EXISTS piles
ADD COLUMN IF NOT EXISTS pile_location TEXT;

COMMENT ON COLUMN piles.pile_location IS 'Location or address information for the pile';
