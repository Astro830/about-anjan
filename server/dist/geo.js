"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toRadians = toRadians;
exports.haversineDistanceMeters = haversineDistanceMeters;
exports.isInsideGeofence = isInsideGeofence;
exports.smoothPositionsKalman = smoothPositionsKalman;
exports.totalPathDistanceMeters = totalPathDistanceMeters;
const EARTH_RADIUS_M = 6371000;
function toRadians(deg) {
    return (deg * Math.PI) / 180;
}
function haversineDistanceMeters(a, b) {
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
function isInsideGeofence(point, center, radiusMeters) {
    return haversineDistanceMeters(point, center) <= radiusMeters;
}
function smoothPositionsKalman(positions) {
    // Placeholder for a simple smoothing; a true Kalman is out of scope here.
    if (positions.length <= 2)
        return positions.map(p => ({ lat: p.lat, lon: p.lon }));
    const smoothed = [];
    for (let i = 0; i < positions.length; i += 1) {
        const window = positions.slice(Math.max(0, i - 2), Math.min(positions.length, i + 3));
        const lat = window.reduce((s, p) => s + p.lat, 0) / window.length;
        const lon = window.reduce((s, p) => s + p.lon, 0) / window.length;
        smoothed.push({ lat, lon });
    }
    return smoothed;
}
function totalPathDistanceMeters(positions) {
    let total = 0;
    for (let i = 1; i < positions.length; i += 1) {
        const prev = positions[i - 1];
        const curr = positions[i];
        total += haversineDistanceMeters(prev, curr);
    }
    return total;
}
//# sourceMappingURL=geo.js.map