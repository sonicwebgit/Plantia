export async function GET(request: Request): Promise<Response> {
  try {
    console.log('Starting simple database migration...');
    
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'DATABASE_URL not found'
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
    
    // Use dynamic import to avoid module issues
    const { Pool } = await import('pg');
    
    const pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    
    // Simple test and table creation
    const client = await pool.connect();
    
    try {
      // Test connection
      await client.query('SELECT NOW()');
      
      // Create users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id text primary key,
          email text unique,
          name text,
          image text,
          created_at timestamptz default now()
        )
      `);
      
      // Create sessions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS sessions (
          id text primary key,
          user_id text references users(id) on delete cascade,
          expires_at timestamptz not null
        )
      `);
      
      // Create user_keys table
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_keys (
          id text primary key,
          user_id text references users(id) on delete cascade,
          hashed_password text,
          provider_id text not null,
          provider_user_id text not null,
          unique(provider_id, provider_user_id)
        )
      `);
      
      console.log('Migration completed successfully!');
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Database tables created successfully!',
        tables: ['users', 'sessions', 'user_keys']
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      
    } finally {
      client.release();
      await pool.end();
    }
    
  } catch (error) {
    console.error('Migration error:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Migration failed'
    }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}