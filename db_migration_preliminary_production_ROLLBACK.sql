-- Rollback: Remove preliminary_production table
-- Run this to undo the preliminary_production migration
-- Date: 2025-12-15

-- Drop RLS policies
DROP POLICY IF EXISTS "Users can view preliminary production data in their projects" ON preliminary_production;
DROP POLICY IF EXISTS "Users can insert preliminary production data in their projects" ON preliminary_production;
DROP POLICY IF EXISTS "Users can update preliminary production data in their projects" ON preliminary_production;
DROP POLICY IF EXISTS "Users can delete preliminary production data in their projects" ON preliminary_production;

-- Drop trigger
DROP TRIGGER IF EXISTS update_preliminary_production_updated_at ON preliminary_production;

-- Drop indexes
DROP INDEX IF EXISTS idx_preliminary_production_project_id;
DROP INDEX IF EXISTS idx_preliminary_production_machine;
DROP INDEX IF EXISTS idx_preliminary_production_date;

-- Drop table
DROP TABLE IF EXISTS preliminary_production;
