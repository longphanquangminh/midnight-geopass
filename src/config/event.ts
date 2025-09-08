/**
 * Event configuration for GeoPass
 * Defines location, boundaries, and verification parameters
 */

/**
 * Event configuration type
 */
export interface EventConfig {
  id: string;
  name: string;
  location: string;
  center: [number, number]; // [longitude, latitude]
  geofence: [number, number][]; // Array of [longitude, latitude] points forming a closed polygon
  bbox: BoundingBox;
}

/**
 * Bounding box type for geofence
 */
export interface BoundingBox {
  latMin: number;
  latMax: number;
  lonMin: number;
  lonMax: number;
}

/**
 * Check if coordinates are inside a bounding box
 * @param lat Latitude
 * @param lon Longitude
 * @param bbox Bounding box
 * @returns boolean
 */
export function isInside(lat: number, lon: number, bbox: BoundingBox): boolean {
  return (
    lat >= bbox.latMin &&
    lat <= bbox.latMax &&
    lon >= bbox.lonMin &&
    lon <= bbox.lonMax
  );
}

/**
 * Convert coordinates to unsigned integers for Compact contract
 * Adds offset to ensure positive values
 * @param latE6 Latitude × 1,000,000
 * @param lonE6 Longitude × 1,000,000
 * @returns [Uint32 latitude, Uint32 longitude]
 */
export function toUint32Coords(latE6: number, lonE6: number): [number, number] {
  // Add offset to ensure positive values
  const latOffset = 90_000_000; // +90 degrees in microdegrees
  const lonOffset = 180_000_000; // +180 degrees in microdegrees
  
  return [
    latE6 + latOffset,
    lonE6 + lonOffset
  ];
}

/**
 * Default event configuration for Ho Chi Minh City
 */
const DEFAULT_EVENT: EventConfig = {
  id: 'hcmc-demo',
  name: 'Ho Chi Minh City – City-Wide Demo',
  location: 'Ho Chi Minh City, Vietnam',
  center: [106.6297, 10.8231], // City centre [lon, lat]
  // Rectangle polygon covering the whole city (very coarse bbox)
  geofence: [
    [106.50, 10.95], // Northwest
    [106.90, 10.95], // Northeast
    [106.90, 10.70], // Southeast
    [106.50, 10.70], // Southwest
    [106.50, 10.95], // Close the polygon
  ],
  bbox: {
    latMin: 10.70,
    latMax: 10.95,
    lonMin: 106.50,
    lonMax: 106.90
  }
};

export default DEFAULT_EVENT;
