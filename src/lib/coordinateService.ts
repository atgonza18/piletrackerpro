/**
 * Coordinate Conversion Service for PileTrackerPro
 *
 * Converts State Plane coordinates (Northing/Easting) to WGS84 (lat/lng)
 * for display on Mapbox maps using deck.gl
 */

import proj4 from 'proj4';

// =====================================================
// State Plane Coordinate System Definitions (NAD83)
// =====================================================

// proj4 definitions for common US State Plane zones
// Units are US Survey Feet unless otherwise noted
const STATE_PLANE_DEFINITIONS: { [epsgCode: string]: { name: string; def: string } } = {
  // Oklahoma
  'EPSG:2267': {
    name: 'Oklahoma North',
    def: '+proj=lcc +lat_1=35.56666666666667 +lat_2=36.76666666666667 +lat_0=35 +lon_0=-98 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },
  'EPSG:2268': {
    name: 'Oklahoma South',
    def: '+proj=lcc +lat_1=33.93333333333333 +lat_2=35.23333333333333 +lat_0=33.33333333333334 +lon_0=-98 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },

  // Texas
  'EPSG:2275': {
    name: 'Texas North',
    def: '+proj=lcc +lat_1=34.65 +lat_2=36.18333333333333 +lat_0=34 +lon_0=-101.5 +x_0=200000.0001016002 +y_0=999999.9998983998 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },
  'EPSG:2276': {
    name: 'Texas North Central',
    def: '+proj=lcc +lat_1=32.13333333333333 +lat_2=33.96666666666667 +lat_0=31.66666666666667 +lon_0=-98.5 +x_0=600000 +y_0=2000000.0001016 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },
  'EPSG:2277': {
    name: 'Texas Central',
    def: '+proj=lcc +lat_1=30.11666666666667 +lat_2=31.88333333333333 +lat_0=29.66666666666667 +lon_0=-100.3333333333333 +x_0=700000.0001016001 +y_0=3000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },
  'EPSG:2278': {
    name: 'Texas South Central',
    def: '+proj=lcc +lat_1=28.38333333333333 +lat_2=30.28333333333333 +lat_0=27.83333333333333 +lon_0=-99 +x_0=600000 +y_0=4000000.0001016 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },
  'EPSG:2279': {
    name: 'Texas South',
    def: '+proj=lcc +lat_1=26.16666666666667 +lat_2=27.83333333333333 +lat_0=25.66666666666667 +lon_0=-98.5 +x_0=300000.0000000001 +y_0=5000000.0001016 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },

  // California
  'EPSG:2225': {
    name: 'California Zone 1',
    def: '+proj=lcc +lat_1=40 +lat_2=41.66666666666666 +lat_0=39.33333333333334 +lon_0=-122 +x_0=2000000.0001016 +y_0=500000.0001016001 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },
  'EPSG:2226': {
    name: 'California Zone 2',
    def: '+proj=lcc +lat_1=38.33333333333334 +lat_2=39.83333333333334 +lat_0=37.66666666666666 +lon_0=-122 +x_0=2000000.0001016 +y_0=500000.0001016001 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },
  'EPSG:2227': {
    name: 'California Zone 3',
    def: '+proj=lcc +lat_1=37.06666666666667 +lat_2=38.43333333333333 +lat_0=36.5 +lon_0=-120.5 +x_0=2000000.0001016 +y_0=500000.0001016001 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },
  'EPSG:2228': {
    name: 'California Zone 4',
    def: '+proj=lcc +lat_1=36 +lat_2=37.25 +lat_0=35.33333333333334 +lon_0=-119 +x_0=2000000.0001016 +y_0=500000.0001016001 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },
  'EPSG:2229': {
    name: 'California Zone 5',
    def: '+proj=lcc +lat_1=34.03333333333333 +lat_2=35.46666666666667 +lat_0=33.5 +lon_0=-118 +x_0=2000000.0001016 +y_0=500000.0001016001 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },
  'EPSG:2230': {
    name: 'California Zone 6',
    def: '+proj=lcc +lat_1=32.78333333333333 +lat_2=33.88333333333333 +lat_0=32.16666666666666 +lon_0=-116.25 +x_0=2000000.0001016 +y_0=500000.0001016001 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },

  // Florida
  'EPSG:2236': {
    name: 'Florida East',
    def: '+proj=tmerc +lat_0=24.33333333333333 +lon_0=-81 +k=0.999941177 +x_0=200000.0001016002 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },
  'EPSG:2237': {
    name: 'Florida West',
    def: '+proj=tmerc +lat_0=24.33333333333333 +lon_0=-82 +k=0.999941177 +x_0=200000.0001016002 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },
  'EPSG:2238': {
    name: 'Florida North',
    def: '+proj=lcc +lat_1=29.58333333333333 +lat_2=30.75 +lat_0=29 +lon_0=-84.5 +x_0=600000 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },

  // Arizona
  'EPSG:2222': {
    name: 'Arizona East',
    def: '+proj=tmerc +lat_0=31 +lon_0=-110.1666666666667 +k=0.9999 +x_0=213360 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },
  'EPSG:2223': {
    name: 'Arizona Central',
    def: '+proj=tmerc +lat_0=31 +lon_0=-111.9166666666667 +k=0.9999 +x_0=213360 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },
  'EPSG:2224': {
    name: 'Arizona West',
    def: '+proj=tmerc +lat_0=31 +lon_0=-113.75 +k=0.999933333 +x_0=213360 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },

  // Colorado
  'EPSG:2231': {
    name: 'Colorado North',
    def: '+proj=lcc +lat_1=39.71666666666667 +lat_2=40.78333333333333 +lat_0=39.33333333333334 +lon_0=-105.5 +x_0=914401.8288036576 +y_0=304800.6096012192 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },
  'EPSG:2232': {
    name: 'Colorado Central',
    def: '+proj=lcc +lat_1=38.45 +lat_2=39.75 +lat_0=37.83333333333334 +lon_0=-105.5 +x_0=914401.8288036576 +y_0=304800.6096012192 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },
  'EPSG:2233': {
    name: 'Colorado South',
    def: '+proj=lcc +lat_1=37.23333333333333 +lat_2=38.43333333333333 +lat_0=36.66666666666666 +lon_0=-105.5 +x_0=914401.8288036576 +y_0=304800.6096012192 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },

  // Georgia
  'EPSG:2239': {
    name: 'Georgia East',
    def: '+proj=tmerc +lat_0=30 +lon_0=-82.16666666666667 +k=0.9999 +x_0=200000.0001016002 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },
  'EPSG:2240': {
    name: 'Georgia West',
    def: '+proj=tmerc +lat_0=30 +lon_0=-84.16666666666667 +k=0.9999 +x_0=700000.0001016001 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },

  // North Carolina
  'EPSG:2264': {
    name: 'North Carolina',
    def: '+proj=lcc +lat_1=34.33333333333334 +lat_2=36.16666666666666 +lat_0=33.75 +lon_0=-79 +x_0=609601.2192024384 +y_0=0 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },

  // Virginia
  'EPSG:2283': {
    name: 'Virginia North',
    def: '+proj=lcc +lat_1=38.03333333333333 +lat_2=39.2 +lat_0=37.66666666666666 +lon_0=-78.5 +x_0=3500000.0001016 +y_0=2000000.0001016 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },
  'EPSG:2284': {
    name: 'Virginia South',
    def: '+proj=lcc +lat_1=36.76666666666667 +lat_2=37.96666666666667 +lat_0=36.33333333333334 +lon_0=-78.5 +x_0=3500000.0001016 +y_0=1000000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },

  // Nevada
  'EPSG:2258': {
    name: 'Nevada East',
    def: '+proj=tmerc +lat_0=34.75 +lon_0=-115.5833333333333 +k=0.9999 +x_0=200000.00001016 +y_0=8000000.000010163 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },
  'EPSG:2259': {
    name: 'Nevada Central',
    def: '+proj=tmerc +lat_0=34.75 +lon_0=-116.6666666666667 +k=0.9999 +x_0=500000.00001016 +y_0=6000000.000010163 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },
  'EPSG:2260': {
    name: 'Nevada West',
    def: '+proj=tmerc +lat_0=34.75 +lon_0=-118.5833333333333 +k=0.9999 +x_0=800000.0000101599 +y_0=4000000.000010163 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=us-ft +no_defs'
  },
};

// Register all definitions with proj4
Object.entries(STATE_PLANE_DEFINITIONS).forEach(([code, { def }]) => {
  proj4.defs(code, def);
});

// =====================================================
// Types
// =====================================================

export interface LatLng {
  lat: number;
  lng: number;
}

export interface CoordinateSystemInfo {
  code: string;
  name: string;
}

// =====================================================
// Conversion Functions
// =====================================================

/**
 * Convert State Plane coordinates to WGS84 lat/lng
 * @param easting - Easting value (X coordinate) in feet
 * @param northing - Northing value (Y coordinate) in feet
 * @param epsgCode - EPSG code for the State Plane zone (e.g., 'EPSG:2267')
 * @returns Lat/lng object or null if conversion fails
 */
export function convertStatePlaneToLatLng(
  easting: number,
  northing: number,
  epsgCode: string
): LatLng | null {
  try {
    if (!STATE_PLANE_DEFINITIONS[epsgCode]) {
      console.error(`Unknown EPSG code: ${epsgCode}`);
      return null;
    }

    // proj4 expects [x, y] which is [easting, northing]
    const [lng, lat] = proj4(epsgCode, 'WGS84', [easting, northing]);

    // Validate the result is reasonable (within continental US roughly)
    if (lat < 24 || lat > 50 || lng < -125 || lng > -66) {
      console.warn(`Converted coordinates seem outside continental US: lat=${lat}, lng=${lng}`);
    }

    return { lat, lng };
  } catch (error) {
    console.error('Error converting coordinates:', error);
    return null;
  }
}

/**
 * Batch convert multiple coordinate pairs
 * @param coordinates - Array of {easting, northing} objects
 * @param epsgCode - EPSG code for the State Plane zone
 * @returns Array of converted coordinates (null entries for failed conversions)
 */
export function convertStatePlaneBatch(
  coordinates: Array<{ easting: number; northing: number }>,
  epsgCode: string
): Array<LatLng | null> {
  return coordinates.map(({ easting, northing }) =>
    convertStatePlaneToLatLng(easting, northing, epsgCode)
  );
}

/**
 * Get the center point of a batch of coordinates
 * @param coordinates - Array of lat/lng points
 * @returns Center point or null if no valid coordinates
 */
export function getCoordinatesCenter(coordinates: LatLng[]): LatLng | null {
  const validCoords = coordinates.filter(c => c !== null);
  if (validCoords.length === 0) return null;

  const sumLat = validCoords.reduce((sum, c) => sum + c.lat, 0);
  const sumLng = validCoords.reduce((sum, c) => sum + c.lng, 0);

  return {
    lat: sumLat / validCoords.length,
    lng: sumLng / validCoords.length
  };
}

// =====================================================
// Zone Detection Functions
// =====================================================

// State boundaries and their zones (simplified for auto-detection)
interface StateZoneMapping {
  name: string;
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number };
  zones: Array<{
    code: string;
    name: string;
    latBoundary?: number; // For north/south zone splits
  }>;
}

const STATE_ZONE_MAPPINGS: StateZoneMapping[] = [
  {
    name: 'Oklahoma',
    bounds: { minLat: 33.6, maxLat: 37.0, minLng: -103.0, maxLng: -94.4 },
    zones: [
      { code: 'EPSG:2267', name: 'Oklahoma North', latBoundary: 35.4 },
      { code: 'EPSG:2268', name: 'Oklahoma South' }
    ]
  },
  {
    name: 'Texas',
    bounds: { minLat: 25.8, maxLat: 36.5, minLng: -106.6, maxLng: -93.5 },
    zones: [
      { code: 'EPSG:2275', name: 'Texas North', latBoundary: 34.5 },
      { code: 'EPSG:2276', name: 'Texas North Central', latBoundary: 32.0 },
      { code: 'EPSG:2277', name: 'Texas Central', latBoundary: 30.0 },
      { code: 'EPSG:2278', name: 'Texas South Central', latBoundary: 28.0 },
      { code: 'EPSG:2279', name: 'Texas South' }
    ]
  },
  {
    name: 'California',
    bounds: { minLat: 32.5, maxLat: 42.0, minLng: -124.4, maxLng: -114.1 },
    zones: [
      { code: 'EPSG:2225', name: 'California Zone 1', latBoundary: 40.0 },
      { code: 'EPSG:2226', name: 'California Zone 2', latBoundary: 38.5 },
      { code: 'EPSG:2227', name: 'California Zone 3', latBoundary: 37.0 },
      { code: 'EPSG:2228', name: 'California Zone 4', latBoundary: 35.5 },
      { code: 'EPSG:2229', name: 'California Zone 5', latBoundary: 34.0 },
      { code: 'EPSG:2230', name: 'California Zone 6' }
    ]
  },
  {
    name: 'Florida',
    bounds: { minLat: 24.5, maxLat: 31.0, minLng: -87.6, maxLng: -80.0 },
    zones: [
      { code: 'EPSG:2238', name: 'Florida North', latBoundary: 29.5 },
      { code: 'EPSG:2236', name: 'Florida East' }, // East of ~81.5 lng
      { code: 'EPSG:2237', name: 'Florida West' }  // West of ~81.5 lng
    ]
  },
  {
    name: 'Arizona',
    bounds: { minLat: 31.3, maxLat: 37.0, minLng: -114.8, maxLng: -109.0 },
    zones: [
      { code: 'EPSG:2222', name: 'Arizona East' },
      { code: 'EPSG:2223', name: 'Arizona Central' },
      { code: 'EPSG:2224', name: 'Arizona West' }
    ]
  },
  {
    name: 'Colorado',
    bounds: { minLat: 37.0, maxLat: 41.0, minLng: -109.0, maxLng: -102.0 },
    zones: [
      { code: 'EPSG:2231', name: 'Colorado North', latBoundary: 39.6 },
      { code: 'EPSG:2232', name: 'Colorado Central', latBoundary: 38.3 },
      { code: 'EPSG:2233', name: 'Colorado South' }
    ]
  },
  {
    name: 'Georgia',
    bounds: { minLat: 30.4, maxLat: 35.0, minLng: -85.6, maxLng: -80.8 },
    zones: [
      { code: 'EPSG:2239', name: 'Georgia East' },
      { code: 'EPSG:2240', name: 'Georgia West' }
    ]
  },
  {
    name: 'North Carolina',
    bounds: { minLat: 33.8, maxLat: 36.6, minLng: -84.3, maxLng: -75.5 },
    zones: [
      { code: 'EPSG:2264', name: 'North Carolina' }
    ]
  },
  {
    name: 'Virginia',
    bounds: { minLat: 36.5, maxLat: 39.5, minLng: -83.7, maxLng: -75.2 },
    zones: [
      { code: 'EPSG:2283', name: 'Virginia North', latBoundary: 38.0 },
      { code: 'EPSG:2284', name: 'Virginia South' }
    ]
  },
  {
    name: 'Nevada',
    bounds: { minLat: 35.0, maxLat: 42.0, minLng: -120.0, maxLng: -114.0 },
    zones: [
      { code: 'EPSG:2258', name: 'Nevada East' },
      { code: 'EPSG:2259', name: 'Nevada Central' },
      { code: 'EPSG:2260', name: 'Nevada West' }
    ]
  }
];

/**
 * Auto-detect the most likely State Plane zone based on geographic location
 * @param lat - Latitude of the project location
 * @param lng - Longitude of the project location
 * @returns EPSG code or null if no match found
 */
export function detectStatePlaneZone(lat: number, lng: number): string | null {
  // Find which state the location is in
  const state = STATE_ZONE_MAPPINGS.find(s =>
    lat >= s.bounds.minLat &&
    lat <= s.bounds.maxLat &&
    lng >= s.bounds.minLng &&
    lng <= s.bounds.maxLng
  );

  if (!state) {
    console.warn(`Could not determine state for coordinates: lat=${lat}, lng=${lng}`);
    return null;
  }

  // If the state has only one zone, return it
  if (state.zones.length === 1) {
    return state.zones[0].code;
  }

  // For states with multiple zones split by latitude
  // Zones are ordered north to south, so find the first where lat is above the boundary
  for (let i = 0; i < state.zones.length; i++) {
    const zone = state.zones[i];
    if (zone.latBoundary === undefined || lat >= zone.latBoundary) {
      return zone.code;
    }
  }

  // Default to the last (southernmost) zone
  return state.zones[state.zones.length - 1].code;
}

/**
 * Get all available coordinate systems for dropdown selection
 * @returns Array of coordinate system info
 */
export function getAvailableCoordinateSystems(): CoordinateSystemInfo[] {
  return Object.entries(STATE_PLANE_DEFINITIONS).map(([code, { name }]) => ({
    code,
    name
  })).sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Get the name of a coordinate system by EPSG code
 * @param epsgCode - EPSG code
 * @returns Name of the coordinate system or the code if not found
 */
export function getCoordinateSystemName(epsgCode: string): string {
  return STATE_PLANE_DEFINITIONS[epsgCode]?.name || epsgCode;
}

/**
 * Check if an EPSG code is supported
 * @param epsgCode - EPSG code to check
 * @returns True if the code is supported
 */
export function isCoordinateSystemSupported(epsgCode: string): boolean {
  return epsgCode in STATE_PLANE_DEFINITIONS;
}
