"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const db_1 = require("./db");
async function ensureMigrationsTable() {
    await db_1.pool.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}
async function applied() {
    const res = await db_1.pool.query('SELECT filename FROM migrations');
    return new Set(res.rows.map(r => r.filename));
}
async function applyMigration(filePath, filename) {
    const sql = fs_1.default.readFileSync(filePath, 'utf8');
    await db_1.pool.query('BEGIN');
    try {
        await db_1.pool.query(sql);
        await db_1.pool.query('INSERT INTO migrations (filename) VALUES ($1)', [filename]);
        await db_1.pool.query('COMMIT');
        console.log(`Applied ${filename}`);
    }
    catch (err) {
        await db_1.pool.query('ROLLBACK');
        console.error(`Failed ${filename}:`, err);
        throw err;
    }
}
async function main() {
    await ensureMigrationsTable();
    const dir = path_1.default.join(__dirname, '..', 'sql');
    const files = fs_1.default.readdirSync(dir).filter(f => f.endsWith('.sql')).sort();
    const done = await applied();
    for (const f of files) {
        if (done.has(f))
            continue;
        const fp = path_1.default.join(dir, f);
        await applyMigration(fp, f);
    }
    console.log('Migrations complete');
    process.exit(0);
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
//# sourceMappingURL=migrate.js.map