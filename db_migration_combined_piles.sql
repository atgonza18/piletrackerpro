-- Migration to add fields for tracking combined duplicate piles
-- This enables the combine duplicates feature where multiple pile records are merged

-- Add columns for tracking combined piles
ALTER TABLE IF EXISTS piles
ADD COLUMN IF NOT EXISTS is_combined BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS combined_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS combined_pile_ids TEXT[], -- Array of pile IDs that were combined
ADD COLUMN IF NOT EXISTS date_range_start TEXT, -- Start date for combined piles
ADD COLUMN IF NOT EXISTS date_range_end TEXT; -- End date for combined piles

-- Add comments
COMMENT ON COLUMN piles.is_combined IS 'Indicates if this pile represents combined duplicate records';
COMMENT ON COLUMN piles.combined_count IS 'Number of duplicate piles combined into this record (default 1 for non-combined piles)';
COMMENT ON COLUMN piles.combined_pile_ids IS 'Array of original pile database IDs that were combined into this record';
COMMENT ON COLUMN piles.date_range_start IS 'Earliest start date from all combined piles';
COMMENT ON COLUMN piles.date_range_end IS 'Latest start date from all combined piles';
