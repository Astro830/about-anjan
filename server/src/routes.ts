import { Router } from 'express';
import { z } from 'zod';
import { runQuery } from './db';
import { sseHandler } from './leaderboard';
import { processRunnerProgress } from './services/processing';

const router = Router();

router.get('/events', async (_req, res) => {
  const rows = await runQuery<any>('SELECT * FROM events ORDER BY date DESC');
  res.json(rows);
});

router.get('/leaderboard/:eventId/stream', sseHandler);

const eventSchema = z.object({
  name: z.string().min(1),
  date: z.string(),
  startLatitude: z.number(),
  startLongitude: z.number(),
  endLatitude: z.number(),
  endLongitude: z.number(),
  routeGpxUrl: z.string().url().optional().nullable(),
});

router.post('/events', async (req, res) => {
  const parse = eventSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json(parse.error.flatten());
  const e = parse.data;
  const rows = await runQuery<any>(
    `INSERT INTO events (name, date, start_latitude, start_longitude, end_latitude, end_longitude, route_gpx_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`,
    [e.name, e.date, e.startLatitude, e.startLongitude, e.endLatitude, e.endLongitude, e.routeGpxUrl ?? null]
  );
  res.status(201).json(rows[0]);
});

const registerRunnerSchema = z.object({
  eventId: z.string().uuid(),
  bibNumber: z.string().min(1),
  name: z.string().min(1),
});

router.post('/runners', async (req, res) => {
  const parse = registerRunnerSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json(parse.error.flatten());
  const r = parse.data;
  const rows = await runQuery<any>(
    `INSERT INTO runners (event_id, bib_number, name) VALUES ($1,$2,$3) RETURNING *`,
    [r.eventId, r.bibNumber, r.name]
  );
  res.status(201).json(rows[0]);
});

const positionSchema = z.object({
  runnerId: z.string().uuid(),
  eventId: z.string().uuid(),
  timestamp: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  accuracyMeters: z.number().optional().nullable(),
});

router.post('/positions', async (req, res) => {
  const parse = positionSchema.safeParse(req.body);
  if (!parse.success) return res.status(400).json(parse.error.flatten());
  const p = parse.data;
  const rows = await runQuery<any>(
    `INSERT INTO positions (runner_id, event_id, ts, geom, accuracy_m)
     VALUES ($1,$2,$3, ST_SetSRID(ST_MakePoint($4,$5), 4326), $6)
     RETURNING id`,
    [p.runnerId, p.eventId, p.timestamp, p.longitude, p.latitude, p.accuracyMeters ?? null]
  );

  // Trigger async processing (no await to keep ingest fast)
  processRunnerProgress(p.eventId, p.runnerId).catch(() => {});

  res.status(201).json({ id: rows[0].id });
});

router.get('/results/:eventId', async (req, res) => {
  const { eventId } = req.params;
  const rows = await runQuery<any>(
    `SELECT * FROM results WHERE event_id = $1 ORDER BY total_time_sec ASC NULLS LAST`,
    [eventId]
  );
  res.json(rows);
});

export default router;