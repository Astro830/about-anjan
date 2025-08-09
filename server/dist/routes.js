"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const db_1 = require("./db");
const leaderboard_1 = require("./leaderboard");
const processing_1 = require("./services/processing");
const router = (0, express_1.Router)();
router.get('/events', async (_req, res) => {
    const rows = await (0, db_1.runQuery)('SELECT * FROM events ORDER BY date DESC');
    res.json(rows);
});
router.get('/leaderboard/:eventId/stream', leaderboard_1.sseHandler);
const eventSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    date: zod_1.z.string(),
    startLatitude: zod_1.z.number(),
    startLongitude: zod_1.z.number(),
    endLatitude: zod_1.z.number(),
    endLongitude: zod_1.z.number(),
    routeGpxUrl: zod_1.z.string().url().optional().nullable(),
});
router.post('/events', async (req, res) => {
    const parse = eventSchema.safeParse(req.body);
    if (!parse.success)
        return res.status(400).json(parse.error.flatten());
    const e = parse.data;
    const rows = await (0, db_1.runQuery)(`INSERT INTO events (name, date, start_latitude, start_longitude, end_latitude, end_longitude, route_gpx_url)
     VALUES ($1,$2,$3,$4,$5,$6,$7)
     RETURNING *`, [e.name, e.date, e.startLatitude, e.startLongitude, e.endLatitude, e.endLongitude, e.routeGpxUrl ?? null]);
    res.status(201).json(rows[0]);
});
const registerRunnerSchema = zod_1.z.object({
    eventId: zod_1.z.string().uuid(),
    bibNumber: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
});
router.post('/runners', async (req, res) => {
    const parse = registerRunnerSchema.safeParse(req.body);
    if (!parse.success)
        return res.status(400).json(parse.error.flatten());
    const r = parse.data;
    const rows = await (0, db_1.runQuery)(`INSERT INTO runners (event_id, bib_number, name) VALUES ($1,$2,$3) RETURNING *`, [r.eventId, r.bibNumber, r.name]);
    res.status(201).json(rows[0]);
});
const positionSchema = zod_1.z.object({
    runnerId: zod_1.z.string().uuid(),
    eventId: zod_1.z.string().uuid(),
    timestamp: zod_1.z.string(),
    latitude: zod_1.z.number(),
    longitude: zod_1.z.number(),
    accuracyMeters: zod_1.z.number().optional().nullable(),
});
router.post('/positions', async (req, res) => {
    const parse = positionSchema.safeParse(req.body);
    if (!parse.success)
        return res.status(400).json(parse.error.flatten());
    const p = parse.data;
    const rows = await (0, db_1.runQuery)(`INSERT INTO positions (runner_id, event_id, ts, geom, accuracy_m)
     VALUES ($1,$2,$3, ST_SetSRID(ST_MakePoint($4,$5), 4326), $6)
     RETURNING id`, [p.runnerId, p.eventId, p.timestamp, p.longitude, p.latitude, p.accuracyMeters ?? null]);
    // Trigger async processing (no await to keep ingest fast)
    (0, processing_1.processRunnerProgress)(p.eventId, p.runnerId).catch(() => { });
    res.status(201).json({ id: rows[0].id });
});
router.get('/results/:eventId', async (req, res) => {
    const { eventId } = req.params;
    const rows = await (0, db_1.runQuery)(`SELECT * FROM results WHERE event_id = $1 ORDER BY total_time_sec ASC NULLS LAST`, [eventId]);
    res.json(rows);
});
exports.default = router;
//# sourceMappingURL=routes.js.map