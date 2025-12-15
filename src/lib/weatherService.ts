/**
 * Weather Service for PileTrackerPro
 *
 * Provides weather data integration using Open-Meteo API
 * - Free, no API key required
 * - Historical weather data
 * - Current weather conditions
 * - Automatic caching in database
 */

import { supabase } from './supabase';

// =====================================================
// Types and Interfaces
// =====================================================

export interface WeatherData {
  id?: string;
  project_id: string;
  date: string; // YYYY-MM-DD format
  temperature_max: number;
  temperature_min: number;
  temperature_avg: number;
  weather_code: number;
  condition_text: string;
  precipitation_sum: number;
  precipitation_hours: number;
  wind_speed_max: number;
  wind_gusts_max: number;
  wind_direction: number;
  humidity_avg: number;
  cloud_cover_avg: number;
  data_source: string;
}

export interface WeatherConditions {
  temperature: number;
  condition: string;
  precipitation: number;
  windSpeed: number;
  humidity: number;
  icon: string;
}

export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    temperature_2m_mean: number[];
    weather_code: number[];
    precipitation_sum: number[];
    precipitation_hours: number[];
    wind_speed_10m_max: number[];
    wind_gusts_10m_max: number[];
    wind_direction_10m_dominant: number[];
    relative_humidity_2m_mean: number[];
    cloud_cover_mean: number[];
  };
}

// =====================================================
// WMO Weather Code Mapping
// =====================================================

export function getWeatherConditionText(weatherCode: number): string {
  const conditions: { [key: number]: string } = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    56: 'Light freezing drizzle',
    57: 'Dense freezing drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    66: 'Light freezing rain',
    67: 'Heavy freezing rain',
    71: 'Slight snow fall',
    73: 'Moderate snow fall',
    75: 'Heavy snow fall',
    77: 'Snow grains',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    85: 'Slight snow showers',
    86: 'Heavy snow showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail',
  };
  return conditions[weatherCode] || 'Unknown';
}

// Get weather icon emoji based on condition code
export function getWeatherIcon(weatherCode: number): string {
  if (weatherCode === 0) return '☀️';
  if (weatherCode === 1) return '🌤️';
  if (weatherCode === 2) return '⛅';
  if (weatherCode === 3) return '☁️';
  if (weatherCode >= 45 && weatherCode <= 48) return '🌫️';
  if (weatherCode >= 51 && weatherCode <= 57) return '🌧️';
  if (weatherCode >= 61 && weatherCode <= 67) return '🌧️';
  if (weatherCode >= 71 && weatherCode <= 77) return '❄️';
  if (weatherCode >= 80 && weatherCode <= 82) return '🌧️';
  if (weatherCode >= 85 && weatherCode <= 86) return '🌨️';
  if (weatherCode >= 95 && weatherCode <= 99) return '⛈️';
  return '🌡️';
}

// =====================================================
// Open-Meteo API Functions
// =====================================================

/**
 * Fetch current weather using current weather API
 * @param latitude - Location latitude
 * @param longitude - Location longitude
 * @returns Current weather conditions
 */
export async function fetchCurrentWeather(
  latitude: number,
  longitude: number
): Promise<WeatherConditions> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
    ].join(','),
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    precipitation_unit: 'inch',
    timezone: 'auto',
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.current) {
    throw new Error('No current weather data available');
  }

  return {
    temperature: data.current.temperature_2m,
    condition: getWeatherConditionText(data.current.weather_code),
    precipitation: data.current.precipitation,
    windSpeed: data.current.wind_speed_10m,
    humidity: data.current.relative_humidity_2m,
    icon: getWeatherIcon(data.current.weather_code),
  };
}

/**
 * Fetch historical weather data from Open-Meteo Archive API
 * @param latitude - Location latitude
 * @param longitude - Location longitude
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Weather data from API
 */
export async function fetchWeatherFromAPI(
  latitude: number,
  longitude: number,
  startDate: string,
  endDate: string
): Promise<OpenMeteoResponse> {
  // Check if dates are in the past (use archive API) or future (use forecast API)
  const today = new Date().toISOString().split('T')[0];
  const isHistorical = startDate < today;

  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    start_date: startDate,
    end_date: endDate,
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'temperature_2m_mean',
      'weather_code',
      'precipitation_sum',
      'precipitation_hours',
      'wind_speed_10m_max',
      'wind_gusts_10m_max',
      'wind_direction_10m_dominant',
      'relative_humidity_2m_mean',
      'cloud_cover_mean',
    ].join(','),
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    precipitation_unit: 'inch',
    timezone: 'auto',
  });

  // Use archive API for historical data, forecast API for current/future
  const endpoint = isHistorical ? 'archive' : 'forecast';
  const url = `https://archive-api.open-meteo.com/v1/${endpoint}?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// =====================================================
// Database Cache Functions
// =====================================================

/**
 * Get weather data from cache or fetch from API
 * @param projectId - Project UUID
 * @param date - Date (YYYY-MM-DD)
 * @returns Weather data
 */
export async function getWeatherForDate(
  projectId: string,
  date: string
): Promise<WeatherData | null> {
  // First, try to get from cache
  const { data: cachedWeather, error: cacheError } = await supabase
    .from('weather_data')
    .select('*')
    .eq('project_id', projectId)
    .eq('date', date)
    .single();

  if (cachedWeather && !cacheError) {
    return cachedWeather as WeatherData;
  }

  // If not in cache, fetch from API
  // Get project location
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('location_lat, location_lng')
    .eq('id', projectId)
    .single();

  if (projectError || !project || !project.location_lat || !project.location_lng) {
    console.error('Project location not configured:', projectError);
    return null;
  }

  try {
    // Fetch from API
    const apiData = await fetchWeatherFromAPI(
      project.location_lat,
      project.location_lng,
      date,
      date
    );

    if (!apiData.daily || apiData.daily.time.length === 0) {
      return null;
    }

    // Store in cache
    const weatherData: WeatherData = {
      project_id: projectId,
      date: apiData.daily.time[0],
      temperature_max: apiData.daily.temperature_2m_max[0],
      temperature_min: apiData.daily.temperature_2m_min[0],
      temperature_avg: apiData.daily.temperature_2m_mean[0],
      weather_code: apiData.daily.weather_code[0],
      condition_text: getWeatherConditionText(apiData.daily.weather_code[0]),
      precipitation_sum: apiData.daily.precipitation_sum[0],
      precipitation_hours: apiData.daily.precipitation_hours[0],
      wind_speed_max: apiData.daily.wind_speed_10m_max[0],
      wind_gusts_max: apiData.daily.wind_gusts_10m_max[0],
      wind_direction: apiData.daily.wind_direction_10m_dominant[0],
      humidity_avg: apiData.daily.relative_humidity_2m_mean[0],
      cloud_cover_avg: apiData.daily.cloud_cover_mean[0],
      data_source: 'open-meteo',
    };

    const { data: insertedData, error: insertError } = await supabase
      .from('weather_data')
      .insert(weatherData)
      .select()
      .single();

    if (insertError) {
      console.error('Error caching weather data:', insertError);
      // Return data anyway even if cache fails
      return weatherData;
    }

    return insertedData as WeatherData;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return null;
  }
}

/**
 * Bulk fetch weather data for a date range
 * @param projectId - Project UUID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @returns Array of weather data
 */
export async function getWeatherForDateRange(
  projectId: string,
  startDate: string,
  endDate: string
): Promise<WeatherData[]> {
  // Get project location
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('location_lat, location_lng')
    .eq('id', projectId)
    .single();

  if (projectError || !project || !project.location_lat || !project.location_lng) {
    console.error('Project location not configured:', projectError);
    return [];
  }

  try {
    // Fetch from API
    const apiData = await fetchWeatherFromAPI(
      project.location_lat,
      project.location_lng,
      startDate,
      endDate
    );

    if (!apiData.daily || apiData.daily.time.length === 0) {
      return [];
    }

    // Convert to WeatherData array
    const weatherDataArray: WeatherData[] = apiData.daily.time.map((date, index) => ({
      project_id: projectId,
      date: date,
      temperature_max: apiData.daily.temperature_2m_max[index],
      temperature_min: apiData.daily.temperature_2m_min[index],
      temperature_avg: apiData.daily.temperature_2m_mean[index],
      weather_code: apiData.daily.weather_code[index],
      condition_text: getWeatherConditionText(apiData.daily.weather_code[index]),
      precipitation_sum: apiData.daily.precipitation_sum[index],
      precipitation_hours: apiData.daily.precipitation_hours[index],
      wind_speed_max: apiData.daily.wind_speed_10m_max[index],
      wind_gusts_max: apiData.daily.wind_gusts_10m_max[index],
      wind_direction: apiData.daily.wind_direction_10m_dominant[index],
      humidity_avg: apiData.daily.relative_humidity_2m_mean[index],
      cloud_cover_avg: apiData.daily.cloud_cover_mean[index],
      data_source: 'open-meteo',
    }));

    // Bulk insert into cache (upsert to handle duplicates)
    for (const weatherData of weatherDataArray) {
      await supabase
        .from('weather_data')
        .upsert(weatherData, { onConflict: 'project_id,date' });
    }

    return weatherDataArray;
  } catch (error) {
    console.error('Error fetching weather data range:', error);
    return [];
  }
}

/**
 * Get weather summary for display (simplified format)
 */
export function getWeatherSummary(weatherData: WeatherData | null): string {
  if (!weatherData) return 'No weather data';

  const temp = Math.round(weatherData.temperature_avg);
  const precip = weatherData.precipitation_sum > 0
    ? ` • ${weatherData.precipitation_sum.toFixed(2)}" rain`
    : '';

  return `${getWeatherIcon(weatherData.weather_code)} ${temp}°F ${weatherData.condition_text}${precip}`;
}

/**
 * Fetch 7-day weather forecast
 * @param latitude - Location latitude
 * @param longitude - Location longitude
 * @returns Array of daily forecast data
 */
export interface ForecastDay {
  date: string;
  dayName: string;
  temperatureMax: number;
  temperatureMin: number;
  weatherCode: number;
  condition: string;
  icon: string;
  precipitationSum: number;
  precipitationProbability: number;
  snowfallSum: number;
  windSpeedMax: number;
  windGustsMax: number;
  humidity: number;
  uvIndexMax: number;
}

export async function fetchWeatherForecast(
  latitude: number,
  longitude: number
): Promise<ForecastDay[]> {
  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    daily: [
      'temperature_2m_max',
      'temperature_2m_min',
      'weather_code',
      'precipitation_sum',
      'precipitation_probability_max',
      'snowfall_sum',
      'wind_speed_10m_max',
      'wind_gusts_10m_max',
      'relative_humidity_2m_mean',
      'uv_index_max',
    ].join(','),
    temperature_unit: 'fahrenheit',
    wind_speed_unit: 'mph',
    precipitation_unit: 'inch',
    timezone: 'auto',
    forecast_days: '7',
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  if (!data.daily || data.daily.time.length === 0) {
    throw new Error('No forecast data available');
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return data.daily.time.map((date: string, index: number) => {
    const dateObj = new Date(date + 'T00:00:00');
    const weatherCode = data.daily.weather_code[index];

    return {
      date,
      dayName: dayNames[dateObj.getDay()],
      temperatureMax: Math.round(data.daily.temperature_2m_max[index]),
      temperatureMin: Math.round(data.daily.temperature_2m_min[index]),
      weatherCode,
      condition: getWeatherConditionText(weatherCode),
      icon: getWeatherIcon(weatherCode),
      precipitationSum: data.daily.precipitation_sum[index] || 0,
      precipitationProbability: data.daily.precipitation_probability_max[index] || 0,
      snowfallSum: data.daily.snowfall_sum[index] || 0,
      windSpeedMax: Math.round(data.daily.wind_speed_10m_max[index]),
      windGustsMax: Math.round(data.daily.wind_gusts_10m_max[index]),
      humidity: Math.round(data.daily.relative_humidity_2m_mean[index]),
      uvIndexMax: data.daily.uv_index_max[index] || 0,
    };
  });
}

/**
 * Geocode an address to get latitude and longitude
 * Uses Nominatim (OpenStreetMap) geocoding service (free, no API key)
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const params = new URLSearchParams({
      q: address,
      format: 'json',
      limit: '1',
    });

    const url = `https://nominatim.openstreetmap.org/search?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'PileTrackerPro Weather Integration',
      },
    });

    if (!response.ok) {
      throw new Error(`Geocoding error: ${response.status}`);
    }

    const data = await response.json();

    if (data.length === 0) {
      return null;
    }

    return {
      lat: parseFloat(data[0].lat),
      lng: parseFloat(data[0].lon),
    };
  } catch (error) {
    console.error('Error geocoding address:', error);
    return null;
  }
}
