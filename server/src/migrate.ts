import fs from 'fs';
import path from 'path';
import { pool } from './db';

async function ensureMigrationsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function applied(): Promise<Set<string>> {
  const res = await pool.query<{ filename: string }>('SELECT filename FROM migrations');
  return new Set(res.rows.map(r => r.filename));
}

async function applyMigration(filePath: string, filename: string): Promise<void> {
  const sql = fs.readFileSync(filePath, 'utf8');
  await pool.query('BEGIN');
  try {
    await pool.query(sql);
    await pool.query('INSERT INTO migrations (filename) VALUES ($1)', [filename]);
    await pool.query('COMMIT');
    console.log(`Applied ${filename}`);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error(`Failed ${filename}:`, err);
    throw err;
  }
}

async function main() {
  await ensureMigrationsTable();
  const dir = path.join(__dirname, '..', 'sql');
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
  const done = await applied();
  for (const f of files) {
    if (done.has(f)) continue;
    const fp = path.join(dir, f);
    await applyMigration(fp, f);
  }
  console.log('Migrations complete');
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});