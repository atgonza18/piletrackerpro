-- Migration to add all necessary columns for CSV import to the piles table
-- Based on the CSV format: Block, Design Embedment, Duration, Embedment, End Z, Gain/30, Machine, Pile Color, Pile ID, Start Date, Start Time, Start Z, Stop Time, Zone

-- First, make sure pile_status field exists (it's used in the app)
ALTER TABLE IF EXISTS piles 
ADD COLUMN IF NOT EXISTS pile_status TEXT DEFAULT 'pending';

-- Add CSV-specific columns if they don't exist
ALTER TABLE IF EXISTS piles
ADD COLUMN IF NOT EXISTS block TEXT,
ADD COLUMN IF NOT EXISTS design_embedment NUMERIC,
ADD COLUMN IF NOT EXISTS duration TEXT,
ADD COLUMN IF NOT EXISTS embedment NUMERIC,
ADD COLUMN IF NOT EXISTS end_z NUMERIC,
ADD COLUMN IF NOT EXISTS gain_per_30_seconds NUMERIC,
ADD COLUMN IF NOT EXISTS machine NUMERIC,
ADD COLUMN IF NOT EXISTS pile_color TEXT,
ADD COLUMN IF NOT EXISTS pile_id TEXT,
ADD COLUMN IF NOT EXISTS pile_location TEXT,
ADD COLUMN IF NOT EXISTS pile_size TEXT,
ADD COLUMN IF NOT EXISTS start_date TEXT,
ADD COLUMN IF NOT EXISTS start_time TEXT,
ADD COLUMN IF NOT EXISTS start_z NUMERIC,
ADD COLUMN IF NOT EXISTS stop_time TEXT,
ADD COLUMN IF NOT EXISTS zone TEXT;

-- Optional: Add comment to explain the columns' purpose
COMMENT ON TABLE piles IS 'Stores pile data with additional columns for CSV import functionality'; 