-- =====================================================
-- WEATHER SYSTEM MIGRATION
-- =====================================================
-- Adds weather tracking capabilities to PileTrackerPro
-- - Location coordinates for projects (lat/lng)
-- - Weather data caching table
-- - Weather columns on piles table
-- - RLS policies for weather_data table
-- =====================================================

-- =====================================================
-- STEP 1: Add location coordinates to projects table
-- =====================================================

-- Add latitude and longitude fields for precise weather lookup
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS location_lat DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS location_lng DECIMAL(11, 8);

-- Add index for location-based queries
CREATE INDEX IF NOT EXISTS idx_projects_location ON projects(location_lat, location_lng);

-- Add comment to explain the columns
COMMENT ON COLUMN projects.location_lat IS 'Latitude coordinate for weather data lookup';
COMMENT ON COLUMN projects.location_lng IS 'Longitude coordinate for weather data lookup';

-- =====================================================
-- STEP 2: Create weather_data table for caching
-- =====================================================

-- Weather data cache to avoid repeated API calls
-- Stores daily weather data for each project location
CREATE TABLE IF NOT EXISTS weather_data (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Temperature data (in Fahrenheit)
  temperature_max DECIMAL(5, 2),
  temperature_min DECIMAL(5, 2),
  temperature_avg DECIMAL(5, 2),

  -- Weather conditions
  weather_code INTEGER,  -- WMO Weather interpretation code from Open-Meteo
  condition_text TEXT,   -- Human-readable condition (e.g., "Partly Cloudy")

  -- Precipitation data
  precipitation_sum DECIMAL(6, 2),  -- Total precipitation in inches
  precipitation_hours DECIMAL(4, 2), -- Hours of precipitation

  -- Wind data
  wind_speed_max DECIMAL(5, 2),  -- Max wind speed in mph
  wind_gusts_max DECIMAL(5, 2),  -- Max wind gusts in mph
  wind_direction INTEGER,        -- Dominant wind direction in degrees

  -- Other conditions
  humidity_avg DECIMAL(5, 2),    -- Average relative humidity (%)
  cloud_cover_avg DECIMAL(5, 2), -- Average cloud cover (%)

  -- API source tracking
  data_source TEXT DEFAULT 'open-meteo',

  -- Ensure one record per project per date
  UNIQUE(project_id, date)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_weather_data_project ON weather_data(project_id);
CREATE INDEX IF NOT EXISTS idx_weather_data_date ON weather_data(date);
CREATE INDEX IF NOT EXISTS idx_weather_data_project_date ON weather_data(project_id, date);

-- Add trigger for automatic updated_at
CREATE TRIGGER update_weather_data_updated_at
BEFORE UPDATE ON weather_data
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Add comment
COMMENT ON TABLE weather_data IS 'Cached weather data for each project by date to minimize API calls';

-- =====================================================
-- STEP 3: Add weather columns to piles table
-- =====================================================

-- Add weather reference columns to piles
ALTER TABLE piles
ADD COLUMN IF NOT EXISTS weather_data_id UUID REFERENCES weather_data(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS weather_condition TEXT,
ADD COLUMN IF NOT EXISTS weather_temp DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS weather_precipitation DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS weather_wind_speed DECIMAL(5, 2);

-- Add index for weather lookups
CREATE INDEX IF NOT EXISTS idx_piles_weather_data ON piles(weather_data_id);

-- Add comments
COMMENT ON COLUMN piles.weather_data_id IS 'Reference to cached weather data for this pile installation date';
COMMENT ON COLUMN piles.weather_condition IS 'Weather condition at time of installation';
COMMENT ON COLUMN piles.weather_temp IS 'Temperature (°F) at time of installation';
COMMENT ON COLUMN piles.weather_precipitation IS 'Precipitation (inches) on installation date';
COMMENT ON COLUMN piles.weather_wind_speed IS 'Wind speed (mph) at time of installation';

-- =====================================================
-- STEP 4: Create RLS policies for weather_data table
-- =====================================================

-- Enable Row Level Security
ALTER TABLE weather_data ENABLE ROW LEVEL SECURITY;

-- Users can view weather data for their projects
CREATE POLICY "Users can view weather data for their projects"
  ON weather_data
  FOR SELECT
  USING (
    project_id IN (
      SELECT project_id FROM user_projects WHERE user_id = auth.uid()
    )
  );

-- Users can insert weather data for their projects
CREATE POLICY "Users can insert weather data for their projects"
  ON weather_data
  FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT project_id FROM user_projects WHERE user_id = auth.uid()
    )
  );

-- Users can update weather data for their projects
CREATE POLICY "Users can update weather data for their projects"
  ON weather_data
  FOR UPDATE
  USING (
    project_id IN (
      SELECT project_id FROM user_projects WHERE user_id = auth.uid()
    )
  );

-- Users can delete weather data for their projects
CREATE POLICY "Users can delete weather data for their projects"
  ON weather_data
  FOR DELETE
  USING (
    project_id IN (
      SELECT project_id FROM user_projects WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- STEP 5: Create helper function for weather condition text
-- =====================================================

-- Function to convert WMO weather codes to human-readable text
-- Based on Open-Meteo WMO Weather interpretation codes
-- https://open-meteo.com/en/docs
CREATE OR REPLACE FUNCTION get_weather_condition_text(weather_code INTEGER)
RETURNS TEXT AS $$
BEGIN
  RETURN CASE weather_code
    WHEN 0 THEN 'Clear sky'
    WHEN 1 THEN 'Mainly clear'
    WHEN 2 THEN 'Partly cloudy'
    WHEN 3 THEN 'Overcast'
    WHEN 45 THEN 'Foggy'
    WHEN 48 THEN 'Depositing rime fog'
    WHEN 51 THEN 'Light drizzle'
    WHEN 53 THEN 'Moderate drizzle'
    WHEN 55 THEN 'Dense drizzle'
    WHEN 56 THEN 'Light freezing drizzle'
    WHEN 57 THEN 'Dense freezing drizzle'
    WHEN 61 THEN 'Slight rain'
    WHEN 63 THEN 'Moderate rain'
    WHEN 65 THEN 'Heavy rain'
    WHEN 66 THEN 'Light freezing rain'
    WHEN 67 THEN 'Heavy freezing rain'
    WHEN 71 THEN 'Slight snow fall'
    WHEN 73 THEN 'Moderate snow fall'
    WHEN 75 THEN 'Heavy snow fall'
    WHEN 77 THEN 'Snow grains'
    WHEN 80 THEN 'Slight rain showers'
    WHEN 81 THEN 'Moderate rain showers'
    WHEN 82 THEN 'Violent rain showers'
    WHEN 85 THEN 'Slight snow showers'
    WHEN 86 THEN 'Heavy snow showers'
    WHEN 95 THEN 'Thunderstorm'
    WHEN 96 THEN 'Thunderstorm with slight hail'
    WHEN 99 THEN 'Thunderstorm with heavy hail'
    ELSE 'Unknown'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Add comment
COMMENT ON FUNCTION get_weather_condition_text IS 'Converts WMO weather code to human-readable condition text';

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================
-- Next steps:
-- 1. Update project setup/settings UI to capture location coordinates
-- 2. Create weather service to fetch from Open-Meteo API
-- 3. Integrate weather display in dashboard, my-piles, and field entry
-- =====================================================
