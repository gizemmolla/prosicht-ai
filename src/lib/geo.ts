// A simple geocoding dictionary to map country/city names from news to lat/long coordinates.
// Since we don't use a live Geocoding API to save costs/rate-limits, we match text snippets.

export const GEO_DICTIONARY: Record<string, [number, number]> = {
  // Mock Data Specific
  'saarlouis': [49.31, 6.74],
  'stuttgart': [48.77, 9.18],
  'miskolc': [48.10, 20.79],
  'arizona': [34.04, -111.09],
  'phoenix': [33.44, -112.07],
  'nuevo león': [25.59, -99.99],
  'mexico': [23.63, -102.55],
  'france': [46.22, 2.21],
  'germany': [51.16, 10.45],
  'hungary': [47.16, 19.50],
  
  // General Europe
  'uk': [55.37, -3.43],
  'united kingdom': [55.37, -3.43],
  'italy': [41.87, 12.56],
  'spain': [40.46, -3.74],
  'poland': [51.91, 19.14],
  'turkey': [38.96, 35.24],
  'türkiye': [38.96, 35.24],
  'romania': [45.94, 24.96],
  'bulgaria': [42.73, 25.48],
  'czech': [49.81, 15.47],
  'slovakia': [48.66, 19.69],
  'greece': [39.07, 21.82],
  'austria': [47.51, 14.55],
  'sweden': [60.12, 18.64],
  'netherlands': [52.13, 5.29],
  'belgium': [50.50, 4.46],
  'portugal': [39.39, -8.22],
  'ireland': [53.14, -7.69],
  'denmark': [56.26, 9.50],
  'finland': [61.92, 25.74],
  
  // Asia / Global
  'china': [35.86, 104.19],
  'india': [20.59, 78.96],
  'usa': [37.09, -95.71],
  'united states': [37.09, -95.71],
  'brazil': [-14.23, -51.92]
};

export function getCoordinates(locationStr: string | null | undefined): [number, number] | null {
  if (!locationStr) return null;
  const normalized = locationStr.toLowerCase();
  
  // Try exact match first
  if (GEO_DICTIONARY[normalized]) return GEO_DICTIONARY[normalized];
  
  // Try partial match
  for (const [key, coords] of Object.entries(GEO_DICTIONARY)) {
    if (normalized.includes(key)) {
      return coords;
    }
  }
  
  return null;
}
