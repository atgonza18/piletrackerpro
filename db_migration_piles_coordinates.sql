-- Migration to add northing/easting coordinate columns to piles table
-- This allows the heatmap to use piles data directly instead of pile_lookup_data

ALTER TABLE IF EXISTS piles
ADD COLUMN IF NOT EXISTS northing NUMERIC,
ADD COLUMN IF NOT EXISTS easting NUMERIC;

-- Add index for faster coordinate-based queries
CREATE INDEX IF NOT EXISTS idx_piles_coordinates
  ON piles(project_id, northing, easting)
  WHERE northing IS NOT NULL AND easting IS NOT NULL;

COMMENT ON COLUMN piles.northing IS 'Northing coordinate (Y) in State Plane feet, imported from CSV';
COMMENT ON COLUMN piles.easting IS 'Easting coordinate (X) in State Plane feet, imported from CSV';
