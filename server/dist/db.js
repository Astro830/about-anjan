"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.runQuery = runQuery;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const databaseUrl = process.env.DATABASE_URL || '';
if (!databaseUrl) {
    console.warn('DATABASE_URL is not set. Database connections will fail.');
}
exports.pool = new pg_1.Pool({
    connectionString: databaseUrl,
    max: 10,
    idleTimeoutMillis: 30000,
});
async function runQuery(text, params) {
    const client = await exports.pool.connect();
    try {
        const result = await client.query(text, params);
        return result.rows;
    }
    finally {
        client.release();
    }
}
//# sourceMappingURL=db.js.map