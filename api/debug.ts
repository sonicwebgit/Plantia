export async function GET(request: Request): Promise<Response> {
  try {
    const DATABASE_URL = process.env.DATABASE_URL;
    
    const debug = {
      hasDatabase: !!DATABASE_URL,
      databaseUrlLength: DATABASE_URL?.length || 0,
      databaseUrlStart: DATABASE_URL?.substring(0, 50) || 'undefined',
      databaseUrlEnd: DATABASE_URL?.substring(DATABASE_URL.length - 50) || 'undefined',
      nodeEnv: process.env.NODE_ENV,
      vercelEnv: process.env.VERCEL_ENV,
      deployment: process.env.VERCEL_URL
    };
    
    // Test database connection with the new pattern
    if (DATABASE_URL) {
      try {
        const { Pool } = await import('pg');
        const pool = new Pool({
          connectionString: DATABASE_URL,
          ssl: { rejectUnauthorized: false },
          max: 1,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 10000
        });
        
        const client = await pool.connect();
        try {
          const result = await client.query('SELECT NOW() as timestamp, version() as pg_version');
          debug.dbTest = {
            success: true,
            timestamp: result.rows[0]?.timestamp,
            version: result.rows[0]?.pg_version?.substring(0, 50)
          };
        } finally {
          client.release();
          await pool.end();
        }
      } catch (dbError) {
        debug.dbTest = {
          success: false,
          error: dbError instanceof Error ? dbError.message : 'Database test failed'
        };
      }
    }
    
    return new Response(JSON.stringify(debug, null, 2), {
      status: 200,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Debug failed',
      stack: error instanceof Error ? error.stack : undefined
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}