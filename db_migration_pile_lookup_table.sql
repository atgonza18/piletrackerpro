-- Migration to create pile_lookup_data table
-- This table stores the reference data from "pile plot" sheets for Zone and Design Embedment lookups

CREATE TABLE IF NOT EXISTS pile_lookup_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  pile_tag TEXT NOT NULL, -- The TAG/Name column (e.g., "A1.001.01")
  block TEXT, -- Block identifier (e.g., "A1")
  pile_type TEXT, -- The TYPE column (e.g., "2A2B.INTARRAY")
  design_embedment NUMERIC, -- Design embedment value in feet
  northing NUMERIC,
  easting NUMERIC,
  pile_size TEXT,
  UNIQUE(project_id, pile_tag)
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_pile_lookup_project_tag
  ON pile_lookup_data(project_id, pile_tag);

-- Add trigger for updated_at
CREATE TRIGGER update_pile_lookup_data_updated_at
  BEFORE UPDATE ON pile_lookup_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE pile_lookup_data IS 'Stores pile reference/lookup data for Pile Type and Design Embedment lookups during CSV import';
