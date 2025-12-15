-- Migration: Add is_manual_entry flag to piles table
-- This allows distinguishing between piles entered manually vs uploaded via CSV

-- Add the is_manual_entry column with default false
ALTER TABLE piles ADD COLUMN IF NOT EXISTS is_manual_entry BOOLEAN DEFAULT FALSE;

-- Add a comment explaining the column
COMMENT ON COLUMN piles.is_manual_entry IS 'True if pile was entered manually via form, false if uploaded via CSV';

-- Create an index for potential filtering by manual entries
CREATE INDEX IF NOT EXISTS idx_piles_is_manual_entry ON piles(is_manual_entry) WHERE is_manual_entry = TRUE;
