export declare function toRadians(deg: number): number;
export declare function haversineDistanceMeters(a: {
    lat: number;
    lon: number;
}, b: {
    lat: number;
    lon: number;
}): number;
export declare function isInsideGeofence(point: {
    lat: number;
    lon: number;
}, center: {
    lat: number;
    lon: number;
}, radiusMeters: number): boolean;
export declare function smoothPositionsKalman(positions: {
    lat: number;
    lon: number;
    accuracy?: number;
}[]): {
    lat: number;
    lon: number;
}[];
export declare function totalPathDistanceMeters(positions: {
    lat: number;
    lon: number;
}[]): number;
//# sourceMappingURL=geo.d.ts.map