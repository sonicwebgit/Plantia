import { migrate } from './migrate';

export async function GET(request: Request): Promise<Response> {
  try {
    console.log('Running database migration...');
    await migrate();
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Database migration completed successfully!' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Migration error:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Migration failed' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}