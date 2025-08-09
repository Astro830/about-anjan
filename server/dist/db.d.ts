import { Pool } from 'pg';
export declare const pool: Pool;
export declare function runQuery<T = unknown>(text: string, params?: unknown[]): Promise<T[]>;
//# sourceMappingURL=db.d.ts.map