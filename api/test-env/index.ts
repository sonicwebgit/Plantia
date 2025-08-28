export async function GET(request: Request): Promise<Response> {
  // Updated to test fresh environment variables
  try {
    const DATABASE_URL = process.env.DATABASE_URL;
    
    return new Response(JSON.stringify({ 
      hasUrl: !!DATABASE_URL,
      urlLength: DATABASE_URL?.length || 0,
      urlStart: DATABASE_URL?.substring(0, 30) || 'undefined',
      urlEnd: DATABASE_URL?.substring(-30) || 'undefined',
      allEnvKeys: Object.keys(process.env).filter(key => key.includes('DATA')),
      nodeVersion: process.version,
      platform: process.platform
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}