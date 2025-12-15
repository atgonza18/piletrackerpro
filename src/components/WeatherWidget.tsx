"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Cloud, CloudRain, CloudSnow, Sun, Wind, Droplets, AlertTriangle, ChevronDown, ChevronUp, Snowflake, Thermometer, Gauge } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { fetchCurrentWeather, fetchWeatherForecast, getWeatherIcon, getWeatherConditionText, ForecastDay } from "@/lib/weatherService";
import { format, parseISO } from "date-fns";

interface WeatherWidgetProps {
  projectId: string;
  showForecast?: boolean;
}

interface WeatherDisplay {
  temperature: number;
  condition: string;
  precipitation: number;
  windSpeed: number;
  humidity: number;
  icon: string;
}

export function WeatherWidget({ projectId, showForecast = false }: WeatherWidgetProps) {
  const [weather, setWeather] = useState<WeatherDisplay | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isForecastLoading, setIsForecastLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationConfigured, setLocationConfigured] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDay, setSelectedDay] = useState<ForecastDay | null>(null);
  const [projectLocation, setProjectLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const loadWeather = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Check if project has location configured
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('location_lat, location_lng, project_name, project_location')
          .eq('id', projectId)
          .single();

        if (projectError) {
          throw new Error('Failed to load project');
        }

        if (!project.location_lat || !project.location_lng) {
          setLocationConfigured(false);
          setIsLoading(false);
          return;
        }

        setLocationConfigured(true);
        setProjectLocation({ lat: project.location_lat, lng: project.location_lng });

        // Fetch current weather
        const currentWeather = await fetchCurrentWeather(
          project.location_lat,
          project.location_lng
        );

        setWeather(currentWeather);
      } catch (err) {
        console.error('Error loading weather:', err);
        setError(err instanceof Error ? err.message : 'Failed to load weather');
      } finally {
        setIsLoading(false);
      }
    };

    if (projectId) {
      loadWeather();
    }
  }, [projectId]);

  // Load forecast when expanded
  const handleToggleExpand = async () => {
    if (!isExpanded && forecast.length === 0 && projectLocation) {
      setIsForecastLoading(true);
      try {
        const forecastData = await fetchWeatherForecast(projectLocation.lat, projectLocation.lng);
        setForecast(forecastData);
        if (forecastData.length > 0) {
          setSelectedDay(forecastData[0]); // Select today by default
        }
      } catch (err) {
        console.error('Error loading forecast:', err);
      } finally {
        setIsForecastLoading(false);
      }
    }
    setIsExpanded(!isExpanded);
  };

  // Get appropriate weather icon component
  const getWeatherIconComponent = (iconEmoji: string, size: "sm" | "md" | "lg" = "lg") => {
    const sizeClasses = {
      sm: "h-6 w-6",
      md: "h-8 w-8",
      lg: "h-12 w-12"
    };
    const sizeClass = sizeClasses[size];

    if (iconEmoji.includes('☀️') || iconEmoji.includes('🌤️')) return <Sun className={`${sizeClass} text-yellow-500`} />;
    if (iconEmoji.includes('🌧️') || iconEmoji.includes('🌦️')) return <CloudRain className={`${sizeClass} text-blue-500`} />;
    if (iconEmoji.includes('❄️') || iconEmoji.includes('🌨️')) return <CloudSnow className={`${sizeClass} text-blue-300`} />;
    if (iconEmoji.includes('☁️') || iconEmoji.includes('⛅')) return <Cloud className={`${sizeClass} text-slate-400`} />;
    if (iconEmoji.includes('⛈️')) return <CloudRain className={`${sizeClass} text-slate-600`} />;
    if (iconEmoji.includes('🌫️')) return <Cloud className={`${sizeClass} text-slate-300`} />;
    return <Cloud className={`${sizeClass} text-slate-400`} />;
  };

  if (isLoading) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Current Weather</CardTitle>
          <CardDescription>Loading weather data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!locationConfigured) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Weather Not Configured
          </CardTitle>
          <CardDescription>Set project location to enable weather tracking</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-slate-600 space-y-2">
            <p>Weather tracking requires project coordinates to be configured.</p>
            <p className="text-xs text-slate-500">
              Go to <strong>Settings → Project Info</strong> and use the "Auto-Fill from Address" button to configure your location.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-red-600">Weather Error</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!weather) {
    return null;
  }

  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Current Weather</CardTitle>
            <CardDescription>Today's conditions at project site</CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleExpand}
            className="gap-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
          >
            7-Day Forecast
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Main weather display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {getWeatherIconComponent(weather.icon)}
              <div>
                <div className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                  {Math.round(weather.temperature)}°F
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  {weather.condition}
                </div>
              </div>
            </div>
          </div>

          {/* Weather details */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-slate-600 dark:text-slate-400 mb-1">
                <Droplets className="h-4 w-4" />
                <span className="text-xs">Humidity</span>
              </div>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {Math.round(weather.humidity)}%
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-slate-600 dark:text-slate-400 mb-1">
                <Wind className="h-4 w-4" />
                <span className="text-xs">Wind</span>
              </div>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {Math.round(weather.windSpeed)} mph
              </div>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1 text-slate-600 dark:text-slate-400 mb-1">
                <CloudRain className="h-4 w-4" />
                <span className="text-xs">Rain</span>
              </div>
              <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {weather.precipitation > 0 ? `${weather.precipitation.toFixed(2)}"` : 'None'}
              </div>
            </div>
          </div>

          {/* Expandable 7-Day Forecast */}
          {isExpanded && (
            <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-4">
              <h4 className="font-semibold text-slate-900 dark:text-white text-sm">7-Day Forecast</h4>

              {isForecastLoading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
                </div>
              ) : forecast.length > 0 ? (
                <>
                  {/* Forecast Day Cards - Horizontal Scrollable */}
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                    {forecast.map((day, index) => (
                      <button
                        key={day.date}
                        onClick={() => setSelectedDay(day)}
                        className={`flex-shrink-0 w-[72px] p-2 rounded-xl transition-all ${
                          selectedDay?.date === day.date
                            ? 'bg-indigo-600 text-white shadow-lg scale-105'
                            : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                      >
                        <div className={`text-xs font-medium ${selectedDay?.date === day.date ? 'text-indigo-100' : 'text-slate-500 dark:text-slate-400'}`}>
                          {index === 0 ? 'Today' : day.dayName}
                        </div>
                        <div className="flex justify-center my-1">
                          {getWeatherIconComponent(day.icon, "sm")}
                        </div>
                        <div className={`text-sm font-bold ${selectedDay?.date === day.date ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                          {day.temperatureMax}°
                        </div>
                        <div className={`text-xs ${selectedDay?.date === day.date ? 'text-indigo-200' : 'text-slate-500 dark:text-slate-400'}`}>
                          {day.temperatureMin}°
                        </div>
                        {(day.precipitationProbability > 0 || day.snowfallSum > 0) && (
                          <div className={`text-xs mt-1 flex items-center justify-center gap-0.5 ${
                            selectedDay?.date === day.date ? 'text-indigo-200' : 'text-blue-500'
                          }`}>
                            {day.snowfallSum > 0 ? <Snowflake size={10} /> : <Droplets size={10} />}
                            {day.precipitationProbability}%
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* Selected Day Details */}
                  {selectedDay && (
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            {format(parseISO(selectedDay.date), 'EEEE, MMMM d')}
                          </div>
                          <div className="text-lg font-semibold text-slate-900 dark:text-white">
                            {selectedDay.condition}
                          </div>
                        </div>
                        {getWeatherIconComponent(selectedDay.icon, "md")}
                      </div>

                      {/* Temperature Range */}
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <Thermometer className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-slate-600 dark:text-slate-400">High:</span>
                          <span className="font-bold text-slate-900 dark:text-white">{selectedDay.temperatureMax}°F</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Thermometer className="h-4 w-4 text-blue-500" />
                          <span className="text-sm text-slate-600 dark:text-slate-400">Low:</span>
                          <span className="font-bold text-slate-900 dark:text-white">{selectedDay.temperatureMin}°F</span>
                        </div>
                      </div>

                      {/* Detailed Stats Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {/* Precipitation */}
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1 text-blue-500 mb-1">
                            <CloudRain className="h-4 w-4" />
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Precip</div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {selectedDay.precipitationSum > 0 ? `${selectedDay.precipitationSum.toFixed(2)}"` : '0"'}
                          </div>
                          <div className="text-xs text-blue-500">{selectedDay.precipitationProbability}% chance</div>
                        </div>

                        {/* Snow */}
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1 text-cyan-500 mb-1">
                            <Snowflake className="h-4 w-4" />
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Snow</div>
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {selectedDay.snowfallSum > 0 ? `${selectedDay.snowfallSum.toFixed(1)}"` : '0"'}
                          </div>
                          <div className="text-xs text-slate-400">accumulation</div>
                        </div>

                        {/* Wind */}
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1 text-slate-500 mb-1">
                            <Wind className="h-4 w-4" />
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Wind</div>
                          <div className="font-semibold text-slate-900 dark:text-white">{selectedDay.windSpeedMax} mph</div>
                          <div className="text-xs text-slate-400">gusts {selectedDay.windGustsMax} mph</div>
                        </div>

                        {/* Humidity */}
                        <div className="bg-white dark:bg-slate-800 rounded-lg p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1 text-teal-500 mb-1">
                            <Droplets className="h-4 w-4" />
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Humidity</div>
                          <div className="font-semibold text-slate-900 dark:text-white">{selectedDay.humidity}%</div>
                          <div className="text-xs text-slate-400">avg</div>
                        </div>
                      </div>

                      {/* UV Index if significant */}
                      {selectedDay.uvIndexMax >= 3 && (
                        <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${
                          selectedDay.uvIndexMax >= 8 ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400' :
                          selectedDay.uvIndexMax >= 6 ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' :
                          'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                        }`}>
                          <Gauge className="h-4 w-4" />
                          <span>UV Index: {selectedDay.uvIndexMax.toFixed(1)} - {
                            selectedDay.uvIndexMax >= 11 ? 'Extreme' :
                            selectedDay.uvIndexMax >= 8 ? 'Very High' :
                            selectedDay.uvIndexMax >= 6 ? 'High' :
                            selectedDay.uvIndexMax >= 3 ? 'Moderate' : 'Low'
                          }</span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center text-sm text-slate-500 py-4">
                  Unable to load forecast data
                </div>
              )}
            </div>
          )}

          {/* Data source attribution */}
          <div className="text-xs text-slate-500 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700 text-center">
            Weather data provided by Open-Meteo
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
