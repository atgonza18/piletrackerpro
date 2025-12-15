-- Migration: Add is_preliminary flag to piles table
-- This allows tracking preliminary/temporary production data uploaded before complete engineer data is available

-- Add the is_preliminary column with default false
ALTER TABLE piles ADD COLUMN IF NOT EXISTS is_preliminary BOOLEAN DEFAULT FALSE;

-- Add a comment explaining the column
COMMENT ON COLUMN piles.is_preliminary IS 'True if pile was uploaded as preliminary production data (before complete engineer data), false otherwise';

-- Create an index for efficient filtering/deletion of preliminary data
CREATE INDEX IF NOT EXISTS idx_piles_is_preliminary ON piles(is_preliminary) WHERE is_preliminary = TRUE;
