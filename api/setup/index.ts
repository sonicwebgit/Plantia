import { Pool } from 'pg';

export async function GET(request: Request): Promise<Response> {
  let pool: Pool | null = null;
  
  try {
    console.log('Starting database migration...');
    
    // Check for DATABASE_URL
    const DATABASE_URL = process.env.DATABASE_URL;
    if (!DATABASE_URL) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'DATABASE_URL environment variable is not set'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('DATABASE_URL found, creating connection...');
    
    // Create database connection
    pool = new Pool({
      connectionString: DATABASE_URL,
      max: 1,
      idleTimeoutMillis: 5000,
      connectionTimeoutMillis: 10000,
    });
    
    // Test connection
    console.log('Testing database connection...');
    const client = await pool.connect();
    console.log('Database connection successful!');
    
    try {
      // Simple test query
      const testResult = await client.query('SELECT NOW() as current_time');
      console.log('Test query successful:', testResult.rows[0]);
      
      // Database schema - individual statements
      const statements = [
        `CREATE TABLE IF NOT EXISTS users (
          id text primary key,
          email text unique,
          name text,
          image text,
          created_at timestamptz default now()
        )`,
        `CREATE TABLE IF NOT EXISTS sessions (
          id text primary key,
          user_id text references users(id) on delete cascade,
          expires_at timestamptz not null
        )`,
        `CREATE TABLE IF NOT EXISTS user_keys (
          id text primary key,
          user_id text references users(id) on delete cascade,
          hashed_password text,
          provider_id text not null,
          provider_user_id text not null,
          unique(provider_id, provider_user_id)
        )`,
        `CREATE TABLE IF NOT EXISTS categories (
          id text primary key,
          user_id text references users(id) on delete cascade,
          name text not null,
          created_at timestamptz default now()
        )`,
        `CREATE TABLE IF NOT EXISTS plants (
          id text primary key,
          user_id text references users(id) on delete cascade,
          species text not null,
          common_name text,
          confidence numeric,
          nickname text,
          location text,
          category_id text references categories(id) on delete set null,
          notes text,
          created_at timestamptz default now()
        )`,
        `CREATE TABLE IF NOT EXISTS care_profiles (
          id text primary key,
          user_id text references users(id) on delete cascade,
          plant_id text references plants(id) on delete cascade,
          species text not null,
          sunlight text not null,
          watering text not null,
          soil text not null,
          fertilizer text not null,
          temp_range text not null,
          humidity text not null,
          tips text
        )`,
        `CREATE TABLE IF NOT EXISTS photos (
          id text primary key,
          user_id text references users(id) on delete cascade,
          plant_id text references plants(id) on delete cascade,
          url text not null,
          taken_at timestamptz not null,
          notes text
        )`,
        `CREATE TABLE IF NOT EXISTS tasks (
          id text primary key,
          user_id text references users(id) on delete cascade,
          plant_id text references plants(id) on delete cascade,
          type text not null,
          title text not null,
          notes text,
          next_run_at timestamptz not null,
          completed_at timestamptz
        )`,
        `CREATE TABLE IF NOT EXISTS ai_history (
          id text primary key,
          user_id text references users(id) on delete cascade,
          plant_id text references plants(id) on delete cascade,
          question text not null,
          answer text not null,
          photo_url text,
          created_at timestamptz default now()
        )`
      ];
      
      console.log(`Executing ${statements.length} statements...`);
      
      // Execute each statement
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        console.log(`Executing statement ${i + 1}/${statements.length}...`);
        await client.query(statement);
        console.log(`Statement ${i + 1} completed successfully`);
      }
      
      console.log('✅ Database migration completed successfully!');
      
      return new Response(JSON.stringify({ 
        success: true, 
        message: `Database migration completed successfully! Created ${statements.length} tables.`,
        tablesCreated: statements.length,
        timestamp: new Date().toISOString()
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
      
    } finally {
      client.release();
    }
    
  } catch (error) {
    console.error('Migration error:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Migration failed',
      errorType: error instanceof Error ? error.constructor.name : 'Unknown',
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  } finally {
    if (pool) {
      try {
        await pool.end();
      } catch (e) {
        console.error('Error closing pool:', e);
      }
    }
  }
}