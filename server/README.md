# Marathon GPS Backend (Express + PostGIS)

## Prereqs
- Node 18+
- Docker (optional but recommended)

## Setup
```bash
cp .env.example .env
npm install
```

## Run with Docker (PostGIS included)
```bash
docker compose up --build
```
API will be on `http://localhost:4000`. DB on `localhost:5432`.

Run migrations (in another shell):
```bash
npm run migrate
```

## Run locally (no Docker)
- Ensure Postgres with PostGIS is running and `DATABASE_URL` is set in `.env`.
```bash
npm run dev
```

## Endpoints
- GET `/health`
- GET `/api/events`
- POST `/api/events` { name, date, startLatitude, startLongitude, endLatitude, endLongitude, routeGpxUrl? }
- POST `/api/runners` { eventId, bibNumber, name }
- POST `/api/positions` { runnerId, eventId, timestamp, latitude, longitude, accuracyMeters? }
- GET `/api/results/:eventId`
- GET `/api/leaderboard/:eventId/stream` (SSE)

## Notes
- Positions are stored as WGS84 geometry points.
- Extend with computation jobs to detect geofence start/finish and generate results automatically.