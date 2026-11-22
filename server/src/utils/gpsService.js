/**
 * GPS Service: Haversine Formula Distance Calculation
 *
 * How it works:
 * Imagine the Earth as a round ball with radius R = 6,371,000 meters.
 * By converting degrees to radians, we can find the great-circle distance between
 * two coordinate pairs (lat1, lon1) and (lat2, lon2).
 */

const EARTH_RADIUS_METERS = 6371000;

function toRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

/**
 * Calculates the great-circle distance between two GPS coordinates in meters.
 *
 * @param {number} lat1 - Latitude of point 1 in degrees
 * @param {number} lon1 - Longitude of point 1 in degrees
 * @param {number} lat2 - Latitude of point 2 in degrees
 * @param {number} lon2 - Longitude of point 2 in degrees
 * @returns {number} Distance in meters
 */
export function calculateDistanceInMeters(lat1, lon1, lat2, lon2) {
  if (
    typeof lat1 !== 'number' ||
    typeof lon1 !== 'number' ||
    typeof lat2 !== 'number' ||
    typeof lon2 !== 'number'
  ) {
    throw new Error('All coordinates must be valid numbers');
  }

  const phi1 = toRadians(lat1);
  const phi2 = toRadians(lat2);
  const deltaPhi = toRadians(lat2 - lat1);
  const deltaLambda = toRadians(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_METERS * c;
}

/**
 * Verifies if user coordinates are within the parking lot radius boundary.
 *
 * @param {number} userLat - User latitude
 * @param {number} userLng - User longitude
 * @param {number} lotLat - Parking lot center latitude
 * @param {number} lotLng - Parking lot center longitude
 * @param {number} radiusMeters - Allowed radius in meters
 * @returns {{ isInside: boolean, distanceMeters: number }}
 */
export function isInsideParkingLot(userLat, userLng, lotLat, lotLng, radiusMeters) {
  const distance = calculateDistanceInMeters(userLat, userLng, lotLat, lotLng);
  return {
    isInside: distance <= radiusMeters,
    distanceMeters: Math.round(distance * 100) / 100,
  };
}
