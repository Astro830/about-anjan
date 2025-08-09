const EARTH_RADIUS_M = 6371000;

export function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function haversineDistanceMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);

  const aa = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
  return EARTH_RADIUS_M * c;
}

export function isInsideGeofence(point: { lat: number; lon: number }, center: { lat: number; lon: number }, radiusMeters: number): boolean {
  return haversineDistanceMeters(point, center) <= radiusMeters;
}

export function smoothPositionsKalman(positions: { lat: number; lon: number; accuracy?: number }[]): { lat: number; lon: number }[] {
  // Placeholder for a simple smoothing; a true Kalman is out of scope here.
  if (positions.length <= 2) return positions.map(p => ({ lat: p.lat, lon: p.lon }));
  const smoothed: { lat: number; lon: number }[] = [];
  for (let i = 0; i < positions.length; i += 1) {
    const window = positions.slice(Math.max(0, i - 2), Math.min(positions.length, i + 3));
    const lat = window.reduce((s, p) => s + p.lat, 0) / window.length;
    const lon = window.reduce((s, p) => s + p.lon, 0) / window.length;
    smoothed.push({ lat, lon });
  }
  return smoothed;
}

export function totalPathDistanceMeters(positions: { lat: number; lon: number }[]): number {
  let total = 0;
  for (let i = 1; i < positions.length; i += 1) {
    const prev = positions[i - 1]!;
    const curr = positions[i]!;
    total += haversineDistanceMeters(prev, curr);
  }
  return total;
}