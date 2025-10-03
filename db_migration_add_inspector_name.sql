-- Migration: Add inspector_name field to piles table
-- This field tracks who manually entered the pile data

-- Add inspector_name column to piles table
ALTER TABLE piles
ADD COLUMN IF NOT EXISTS inspector_name TEXT;

-- Add comment to document the field
COMMENT ON COLUMN piles.inspector_name IS 'Name of the quality inspector who manually entered this pile data';
