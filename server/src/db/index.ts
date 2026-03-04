import pg from 'pg';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
});

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err);
});

export async function query<T extends pg.QueryResultRow = any>(
  text: string,
  params?: any[],
): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function runMigrations(): Promise<void> {
  const schemaPath = join(__dirname, 'schema.sql');
  const sql = readFileSync(schemaPath, 'utf-8');
  await pool.query(sql);
  console.log('[DB] Migrations complete');
}

export async function closePool(): Promise<void> {
  await pool.end();
}

export default pool;
