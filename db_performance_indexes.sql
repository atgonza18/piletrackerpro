-- Performance Optimization Indexes for PileTrackerPro
-- Run this migration in Supabase SQL Editor to improve query performance
-- These indexes will significantly speed up data loading

-- Index for piles table - most queries filter by project_id
CREATE INDEX IF NOT EXISTS idx_piles_project_id ON piles(project_id);

-- Composite index for piles - project_id and created_at for sorted queries
CREATE INDEX IF NOT EXISTS idx_piles_project_created ON piles(project_id, created_at);

-- Index for user_projects table - frequent lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_projects_user_id ON user_projects(user_id);

-- Index for user_projects table - lookups by project_id
CREATE INDEX IF NOT EXISTS idx_user_projects_project_id ON user_projects(project_id);

-- Composite index for user_projects - user and project lookup
CREATE INDEX IF NOT EXISTS idx_user_projects_user_project ON user_projects(user_id, project_id);

-- Index for piles embedment columns (used in status calculations)
CREATE INDEX IF NOT EXISTS idx_piles_embedment ON piles(project_id, embedment, design_embedment);

-- Index for pile_number lookups (used in duplicate detection)
CREATE INDEX IF NOT EXISTS idx_piles_pile_number ON piles(project_id, pile_number);

-- Analyze tables to update statistics for query optimizer
ANALYZE piles;
ANALYZE user_projects;
ANALYZE projects;

-- Verify indexes were created
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public' 
AND tablename IN ('piles', 'user_projects', 'projects')
ORDER BY tablename, indexname;