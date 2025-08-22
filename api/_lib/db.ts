import { Pool } from 'pg';

const { DATABASE_URL } = process.env;

if (!DATABASE_URL) {
  console.warn('[api/_lib/db] Missing DATABASE_URL environment variable. API routes depending on DB will fail until set.');
}

export const pool = new Pool({
  connectionString: DATABASE_URL,
  max: 1,
  idleTimeoutMillis: 1000,
});

export async function query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
  const client = await pool.connect();
  try {
    const res = await client.query<T>(text, params);
    return { rows: res.rows as T[] };
  } finally {
    client.release();
  }
}
