-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;

-- Base tables
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  start_latitude DOUBLE PRECISION NOT NULL,
  start_longitude DOUBLE PRECISION NOT NULL,
  end_latitude DOUBLE PRECISION NOT NULL,
  end_longitude DOUBLE PRECISION NOT NULL,
  route_gpx_url TEXT
);

CREATE TABLE IF NOT EXISTS runners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  bib_number TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(event_id, bib_number)
);

CREATE TABLE IF NOT EXISTS checkpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  order_index INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_id UUID NOT NULL REFERENCES runners(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  ts TIMESTAMPTZ NOT NULL,
  geom geometry(Point, 4326) NOT NULL,
  accuracy_m DOUBLE PRECISION
);
CREATE INDEX IF NOT EXISTS positions_event_idx ON positions(event_id);
CREATE INDEX IF NOT EXISTS positions_runner_ts_idx ON positions(runner_id, ts);
CREATE INDEX IF NOT EXISTS positions_geom_idx ON positions USING GIST (geom);

CREATE TABLE IF NOT EXISTS results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  runner_id UUID NOT NULL REFERENCES runners(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  total_distance_m DOUBLE PRECISION NOT NULL,
  avg_pace_sec_per_km DOUBLE PRECISION NOT NULL,
  total_time_sec DOUBLE PRECISION GENERATED ALWAYS AS (EXTRACT(EPOCH FROM (end_time - start_time))) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS results_event_idx ON results(event_id);

-- Helper function to compute distance for a runner within an event
CREATE OR REPLACE VIEW runner_paths AS
SELECT 
  p.runner_id,
  p.event_id,
  SUM(
    CASE WHEN lag(p.geom) OVER (PARTITION BY p.runner_id ORDER BY p.ts) IS NULL THEN 0
         ELSE ST_DistanceSphere(lag(p.geom) OVER (PARTITION BY p.runner_id ORDER BY p.ts), p.geom)
    END
  ) AS total_distance_m
FROM positions p
GROUP BY p.runner_id, p.event_id;