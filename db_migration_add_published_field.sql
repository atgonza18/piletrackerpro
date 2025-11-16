-- Migration: Add published field to piles table
-- Description: Adds a published boolean field to control visibility for Owner's Rep accounts
-- Date: 2025-01-16

-- Add published column to piles table (defaults to false for new piles)
ALTER TABLE piles
ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT false;

-- Update existing piles to be published (so current data remains visible)
UPDATE piles
SET published = true
WHERE published IS NULL OR published = false;

-- Create index for performance on published queries
CREATE INDEX IF NOT EXISTS idx_piles_published ON piles(published);

-- Add comment to document the field
COMMENT ON COLUMN piles.published IS 'Controls whether pile data is visible to Owner''s Rep accounts. EPC users see all piles regardless of this field.';
