export type UUID = string;

export interface Event {
  id: UUID;
  name: string;
  date: string; // ISO date string
  startLatitude: number;
  startLongitude: number;
  endLatitude: number;
  endLongitude: number;
  routeGpxUrl?: string | null;
}

export interface Checkpoint {
  id: UUID;
  eventId: UUID;
  name: string;
  latitude: number;
  longitude: number;
  orderIndex: number;
}

export interface Runner {
  id: UUID;
  eventId: UUID;
  bibNumber: string;
  name: string;
  qrCode: string;
}

export interface Position {
  id: UUID;
  runnerId: UUID;
  eventId: UUID;
  timestamp: string; // ISO
  latitude: number;
  longitude: number;
  accuracyMeters?: number | null;
}

export interface Result {
  id: UUID;
  runnerId: UUID;
  eventId: UUID;
  startTime: string; // ISO
  endTime: string; // ISO
  totalDistanceMeters: number;
  averagePaceSecPerKm: number;
}