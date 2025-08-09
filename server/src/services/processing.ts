import { runQuery } from '../db';
import { haversineDistanceMeters } from '../geo';
import { broadcast } from '../leaderboard';

const DEFAULT_GEOFENCE_RADIUS_M = process.env.GEOFENCE_RADIUS_M ? Number(process.env.GEOFENCE_RADIUS_M) : 30;

interface PositionRow {
  ts: string;
  latitude: number;
  longitude: number;
}

export async function processRunnerProgress(eventId: string, runnerId: string): Promise<void> {
  const events = await runQuery<{
    start_latitude: number;
    start_longitude: number;
    end_latitude: number;
    end_longitude: number;
  }>(`SELECT start_latitude, start_longitude, end_latitude, end_longitude FROM events WHERE id = $1`, [eventId]);
  if (events.length === 0) return;
  const ev = events[0]!;

  const positions = await runQuery<PositionRow>(
    `SELECT ts, ST_Y(geom) AS latitude, ST_X(geom) AS longitude
     FROM positions
     WHERE event_id = $1 AND runner_id = $2
     ORDER BY ts ASC`,
    [eventId, runnerId]
  );
  if (positions.length === 0) return;

  const startCenter = { lat: ev.start_latitude, lon: ev.start_longitude };
  const endCenter = { lat: ev.end_latitude, lon: ev.end_longitude };

  let startIdx = -1;
  for (let i = 0; i < positions.length; i += 1) {
    const p = positions[i]!;
    const d = haversineDistanceMeters({ lat: p.latitude, lon: p.longitude }, startCenter);
    if (d <= DEFAULT_GEOFENCE_RADIUS_M) {
      startIdx = i;
      break;
    }
  }
  if (startIdx < 0) return;

  let finishIdx = -1;
  for (let i = startIdx; i < positions.length; i += 1) {
    const p = positions[i]!;
    const d = haversineDistanceMeters({ lat: p.latitude, lon: p.longitude }, endCenter);
    if (d <= DEFAULT_GEOFENCE_RADIUS_M) {
      finishIdx = i;
      break;
    }
  }
  if (finishIdx < 0) {
    // Not finished yet: broadcast leaderboard with current distances
    await broadcastLeaderboard(eventId);
    return;
  }

  let totalMeters = 0;
  for (let i = startIdx + 1; i <= finishIdx; i += 1) {
    const prev = positions[i - 1]!;
    const curr = positions[i]!;
    totalMeters += haversineDistanceMeters(
      { lat: prev.latitude, lon: prev.longitude },
      { lat: curr.latitude, lon: curr.longitude }
    );
  }

  const startTime = positions[startIdx]!.ts;
  const endTime = positions[finishIdx]!.ts;
  const totalTimeSecRows = await runQuery<{ seconds: number }>(
    `SELECT EXTRACT(EPOCH FROM ($2::timestamptz - $1::timestamptz)) AS seconds`,
    [startTime, endTime]
  );
  const totalSec = totalTimeSecRows[0]?.seconds ?? 0;
  const paceSecPerKm = totalMeters > 0 ? (totalSec / (totalMeters / 1000)) : 0;

  await runQuery(
    `INSERT INTO results (runner_id, event_id, start_time, end_time, total_distance_m, avg_pace_sec_per_km)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (runner_id, event_id)
     DO UPDATE SET start_time = EXCLUDED.start_time,
                   end_time = EXCLUDED.end_time,
                   total_distance_m = EXCLUDED.total_distance_m,
                   avg_pace_sec_per_km = EXCLUDED.avg_pace_sec_per_km`,
    [runnerId, eventId, startTime, endTime, totalMeters, paceSecPerKm]
  );

  await broadcastLeaderboard(eventId);
}

export async function broadcastLeaderboard(eventId: string): Promise<void> {
  // Combine finished results (rank by time) and in-progress (rank by distance)
  const rows = await runQuery<any>(
    `WITH d AS (
       SELECT rp.runner_id,
              rp.event_id,
              rp.total_distance_m
       FROM runner_paths rp
       WHERE rp.event_id = $1
     )
     SELECT r.id AS runner_id,
            r.bib_number,
            r.name,
            COALESCE(res.total_distance_m, d.total_distance_m) AS distance_m,
            res.total_time_sec,
            res.avg_pace_sec_per_km,
            CASE WHEN res.total_time_sec IS NOT NULL THEN 1 ELSE 0 END AS finished
     FROM runners r
     LEFT JOIN d ON d.runner_id = r.id AND d.event_id = r.event_id
     LEFT JOIN results res ON res.runner_id = r.id AND res.event_id = r.event_id
     WHERE r.event_id = $1
     ORDER BY finished DESC, res.total_time_sec ASC NULLS LAST, distance_m DESC
     LIMIT 100`,
    [eventId]
  );

  broadcast('leaderboard', { eventId, leaderboard: rows });
}