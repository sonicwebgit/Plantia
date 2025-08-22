import type { VercelRequest, VercelResponse } from '@vercel/node';
import { pool } from '../_lib/db';
import fs from 'fs';
import path from 'path';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  try {
    const sqlPath = path.join(process.cwd(), 'api', '_lib', 'schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    await pool.query(sql);
    res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Migration error', e);
    res.status(500).json({ error: 'Migration failed' });
  }
}
