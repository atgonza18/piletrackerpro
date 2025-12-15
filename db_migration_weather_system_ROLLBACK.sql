-- =====================================================
-- WEATHER SYSTEM MIGRATION ROLLBACK
-- =====================================================
-- Safely removes all weather system components
-- Run this if you need to revert the weather migration
-- =====================================================

-- Drop helper function
DROP FUNCTION IF EXISTS get_weather_condition_text(INTEGER);

-- Drop RLS policies for weather_data
DROP POLICY IF EXISTS "Users can delete weather data for their projects" ON weather_data;
DROP POLICY IF EXISTS "Users can update weather data for their projects" ON weather_data;
DROP POLICY IF EXISTS "Users can insert weather data for their projects" ON weather_data;
DROP POLICY IF EXISTS "Users can view weather data for their projects" ON weather_data;

-- Drop weather columns from piles table
ALTER TABLE piles
DROP COLUMN IF EXISTS weather_wind_speed,
DROP COLUMN IF EXISTS weather_precipitation,
DROP COLUMN IF EXISTS weather_temp,
DROP COLUMN IF EXISTS weather_condition,
DROP COLUMN IF EXISTS weather_data_id;

-- Drop weather_data table
DROP TABLE IF EXISTS weather_data;

-- Drop location columns from projects table
ALTER TABLE projects
DROP COLUMN IF EXISTS location_lng,
DROP COLUMN IF EXISTS location_lat;

-- =====================================================
-- ROLLBACK COMPLETE
-- =====================================================
