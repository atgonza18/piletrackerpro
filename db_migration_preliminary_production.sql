-- Migration: Create preliminary_production table for isolated preliminary data
-- Description: Creates a separate table for preliminary production data (GPS/PD10 exports)
--              that is completely isolated from the main piles table.
--              This data will ONLY appear on the Preliminary tab of the Production page.
-- Date: 2025-12-15

-- Create the preliminary_production table
CREATE TABLE IF NOT EXISTS preliminary_production (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  -- Required field
  machine TEXT NOT NULL,  -- The PD10/rig identifier (required for production tracking)

  -- Optional fields (all optional since we don't know what data will be available)
  pile_id TEXT,
  pile_number TEXT,
  block TEXT,
  start_date TEXT,
  start_time TEXT,
  stop_time TEXT,
  duration TEXT,          -- Format "H:MM:SS"
  embedment NUMERIC,
  design_embedment NUMERIC,
  pile_type TEXT,
  notes TEXT
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_preliminary_production_project_id
  ON preliminary_production(project_id);
CREATE INDEX IF NOT EXISTS idx_preliminary_production_machine
  ON preliminary_production(project_id, machine);
CREATE INDEX IF NOT EXISTS idx_preliminary_production_date
  ON preliminary_production(project_id, start_date);

-- Add trigger for automatic updated_at timestamp
CREATE TRIGGER update_preliminary_production_updated_at
  BEFORE UPDATE ON preliminary_production
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Enable Row Level Security
ALTER TABLE preliminary_production ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can view preliminary production data in their projects
CREATE POLICY "Users can view preliminary production data in their projects"
  ON preliminary_production
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_projects
    WHERE user_projects.project_id = preliminary_production.project_id
    AND user_projects.user_id = auth.uid()
  ));

-- RLS Policy: Users can insert preliminary production data in their projects
CREATE POLICY "Users can insert preliminary production data in their projects"
  ON preliminary_production
  FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_projects
    WHERE user_projects.project_id = preliminary_production.project_id
    AND user_projects.user_id = auth.uid()
  ));

-- RLS Policy: Users can update preliminary production data in their projects
CREATE POLICY "Users can update preliminary production data in their projects"
  ON preliminary_production
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_projects
    WHERE user_projects.project_id = preliminary_production.project_id
    AND user_projects.user_id = auth.uid()
  ));

-- RLS Policy: Users can delete preliminary production data in their projects
CREATE POLICY "Users can delete preliminary production data in their projects"
  ON preliminary_production
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM user_projects
    WHERE user_projects.project_id = preliminary_production.project_id
    AND user_projects.user_id = auth.uid()
  ));

-- Add table and column comments
COMMENT ON TABLE preliminary_production IS 'Stores preliminary production data (GPS/PD10 exports) that is isolated from main pile data. Only visible on the Preliminary tab of the Production page.';
COMMENT ON COLUMN preliminary_production.machine IS 'Required: The PD10/rig identifier for production tracking';
COMMENT ON COLUMN preliminary_production.duration IS 'Optional: Drive time in H:MM:SS format';
