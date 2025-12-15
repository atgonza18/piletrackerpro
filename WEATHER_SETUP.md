# Weather Tracking Setup Guide

This guide walks you through setting up and using the weather tracking feature in PileTrackerPro.

## Overview

The weather tracking system automatically records weather conditions for pile installation dates, allowing you to:
- Track weather conditions at time of installation
- Correlate weather with pile performance (refusals, slow drives, etc.)
- Generate reports with historical weather data
- View current weather conditions at your project site

**Key Benefits:**
- **Free**: Uses Open-Meteo API (no API key required)
- **Historical Data**: Access weather data for any past date
- **Automatic**: Weather is cached and associated with pile installations
- **Accurate**: Uses precise GPS coordinates for your project location

## Setup Steps

### Step 1: Run Database Migration

First, you need to add the weather tracking tables and columns to your database.

1. **Open Supabase Dashboard**
   - Go to your Supabase project
   - Navigate to SQL Editor

2. **Run the Migration**
   - Copy the contents of `db_migration_weather_system.sql`
   - Paste into SQL Editor
   - Click "Run"

The migration will:
- Add `location_lat` and `location_lng` columns to `projects` table
- Create `weather_data` table for caching weather
- Add weather columns to `piles` table
- Set up RLS policies for weather_data
- Create helper function `get_weather_condition_text()`

**Rollback Option**: If you need to revert, run `db_migration_weather_system_ROLLBACK.sql`

### Step 2: Configure Project Location

After the migration, configure your project's GPS coordinates:

1. **Navigate to Settings**
   - Go to Dashboard → Settings → Project Info tab

2. **Find Weather Location Configuration Section**
   - Scroll down to "Weather Location Configuration"
   - You'll see fields for Latitude and Longitude

3. **Auto-Fill Coordinates (Recommended)**
   - Make sure your "Project Location" field has a complete address
     - Example: `123 Main Street, Springfield, IL 62701`
   - Click "Auto-Fill from Address" button
   - The system will geocode your address and populate coordinates

4. **Or Enter Coordinates Manually**
   - Find your project's GPS coordinates (use Google Maps)
   - Enter Latitude (e.g., `39.781721`)
   - Enter Longitude (e.g., `-89.650148`)

5. **Save Settings**
   - Click "Save Changes" button
   - You should see "✓ Weather location configured" status

### Step 3: Verify Weather Widget

1. **Return to Dashboard**
   - You should now see the Weather Widget (will be added in next step)
   - It will display current weather conditions
   - Includes temperature, conditions, humidity, wind, and precipitation

2. **If You See "Weather Not Configured"**
   - Double-check that coordinates are saved in Settings
   - Make sure coordinates are valid (lat: -90 to 90, lng: -180 to 180)
   - Try refreshing the page

## Using Weather Tracking

### Current Weather

**Dashboard Widget** (Coming in next update)
- Shows today's weather at project site
- Updates automatically
- Displays: temperature, conditions, humidity, wind speed, precipitation

### Historical Weather for Piles

Weather data is automatically associated with pile installations based on the `installation_date` field.

**In My Piles Page** (Coming in next update)
- Each pile will show weather icon/conditions
- Hover or click for detailed weather
- Filter piles by weather conditions
- Export includes weather data

**In Field Entry** (Coming in next update)
- Weather auto-populates when entering new pile data
- Shows current conditions at time of entry
- Can be edited if needed

### Weather Data Includes:

For each date, the system tracks:
- **Temperature**: High, low, and average (°F)
- **Conditions**: Clear, cloudy, rain, snow, etc.
- **Precipitation**: Total rainfall/snowfall (inches)
- **Wind**: Max wind speed and gusts (mph)
- **Humidity**: Average relative humidity (%)
- **Cloud Cover**: Average cloud coverage (%)

## Technical Details

### Weather Data Source

- **Provider**: Open-Meteo (https://open-meteo.com)
- **Cost**: Free, no API key required
- **Coverage**: Worldwide
- **Historical Data**: Available for past dates
- **Accuracy**: Uses ERA5 reanalysis and weather station data

### Geocoding Service

- **Provider**: Nominatim (OpenStreetMap)
- **Cost**: Free
- **Usage**: Converts addresses to GPS coordinates
- **Rate Limit**: 1 request per second (adequate for normal use)

### Data Caching

- Weather data is cached in the `weather_data` table
- One record per project per date
- Reduces API calls and improves performance
- Cache is automatically populated when:
  - Viewing piles with installation dates
  - Manually requesting historical weather
  - Viewing dashboard weather widget

### Database Schema

```sql
-- Projects table (added columns)
location_lat DECIMAL(10, 8)  -- Latitude coordinate
location_lng DECIMAL(11, 8)  -- Longitude coordinate

-- Weather data table (new)
CREATE TABLE weather_data (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  date DATE NOT NULL,
  temperature_max DECIMAL(5, 2),
  temperature_min DECIMAL(5, 2),
  temperature_avg DECIMAL(5, 2),
  weather_code INTEGER,
  condition_text TEXT,
  precipitation_sum DECIMAL(6, 2),
  precipitation_hours DECIMAL(4, 2),
  wind_speed_max DECIMAL(5, 2),
  wind_gusts_max DECIMAL(5, 2),
  wind_direction INTEGER,
  humidity_avg DECIMAL(5, 2),
  cloud_cover_avg DECIMAL(5, 2),
  data_source TEXT DEFAULT 'open-meteo',
  UNIQUE(project_id, date)
);

-- Piles table (added columns)
weather_data_id UUID REFERENCES weather_data(id)
weather_condition TEXT
weather_temp DECIMAL(5, 2)
weather_precipitation DECIMAL(5, 2)
weather_wind_speed DECIMAL(5, 2)
```

## Troubleshooting

### "Weather Not Configured" Message

**Problem**: Weather widget shows configuration warning

**Solutions**:
1. Check that Settings → Project Info has latitude/longitude filled
2. Verify coordinates are valid numbers
3. Try re-running the "Auto-Fill from Address" button
4. Manually enter coordinates if geocoding fails

### Geocoding Fails

**Problem**: "Could not geocode this address" error

**Solutions**:
1. Make sure address is complete (street, city, state/province, country)
2. Try a more specific address (include zip/postal code)
3. Use a major landmark or city center address
4. Manually look up coordinates on Google Maps and enter them

### Weather Data Not Loading

**Problem**: Weather widget shows loading spinner or error

**Solutions**:
1. Check browser console for errors
2. Verify project has valid coordinates configured
3. Check internet connection (needs to reach Open-Meteo API)
4. Wait a moment and refresh - initial load may take a few seconds

### Weather Data Missing for Old Piles

**Problem**: Historical piles don't show weather data

**Solution**: Weather data is fetched on-demand. Simply view the pile or visit the My Piles page and the system will automatically fetch and cache historical weather for those dates.

## Privacy & Data

### Data Collection

- Weather data is public information from Open-Meteo
- No personal data is sent to weather services
- Only project coordinates and dates are used for lookups
- GPS coordinates are stored in your Supabase database

### API Usage

- Open-Meteo has no rate limits for reasonable use
- Data is cached to minimize API requests
- Multiple piles on same date share cached weather data
- No API key or account required

## Future Enhancements

Planned features for weather tracking:

1. **Weather Analytics**
   - Correlate weather with pile performance metrics
   - Identify patterns (e.g., more refusals in rain)
   - Filter/group by weather conditions

2. **Weather Alerts**
   - Notify when adverse weather is forecasted
   - Suggest optimal days for pile driving

3. **Multi-Day Forecast**
   - 7-day forecast on dashboard
   - Plan work based on upcoming weather

4. **Weather in Reports**
   - Include weather data in PDF exports
   - Weather summary in Excel exports
   - Custom report filtering by weather

## Support

If you encounter issues with weather tracking:

1. Check this guide for troubleshooting steps
2. Verify the migration was run successfully
3. Check browser console for JavaScript errors
4. Review Supabase logs for database errors
5. Open an issue on GitHub with details

## API Documentation

For more information about the weather data:
- **Open-Meteo API**: https://open-meteo.com/en/docs
- **WMO Weather Codes**: https://open-meteo.com/en/docs#weathervariables
- **Nominatim Geocoding**: https://nominatim.org/release-docs/develop/api/Overview/
