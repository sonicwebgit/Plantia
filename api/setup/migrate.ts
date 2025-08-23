import { pool } from '../_lib/db';
import * as fs from 'fs';
import * as path from 'path';

async function migrate() {
  try {
    console.log('Starting database migration...');
    
    // Read the schema file
    const schemaPath = path.join(__dirname, '..', '_lib', 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    // Execute each statement
    for (const statement of statements) {
      console.log(`Executing: ${statement.substring(0, 50)}...`);
      await pool.query(statement);
    }
    
    console.log('✅ Database migration completed successfully!');
    console.log(`✅ Created ${statements.length} database objects`);
    
  } catch (error) {
    console.error('❌ Database migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration if this file is executed directly
if (require.main === module) {
  migrate();
}

export { migrate };