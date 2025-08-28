export async function GET(request: Request): Promise<Response> {
  try {
    console.log('=== Database Debug Info ===');
    
    // Check environment variables
    const DATABASE_URL = process.env.DATABASE_URL;
    console.log('DATABASE_URL exists:', !!DATABASE_URL);
    console.log('DATABASE_URL length:', DATABASE_URL?.length || 0);
    console.log('DATABASE_URL starts with:', DATABASE_URL?.substring(0, 20) || 'undefined');
    
    if (!DATABASE_URL) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'DATABASE_URL environment variable is not set',
        env: Object.keys(process.env).filter(key => key.includes('DATABASE'))
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Try to parse the URL
    let parsedUrl;
    try {
      parsedUrl = new URL(DATABASE_URL);
      console.log('URL parsed successfully');
      console.log('Protocol:', parsedUrl.protocol);
      console.log('Hostname:', parsedUrl.hostname);
      console.log('Port:', parsedUrl.port);
      console.log('Database:', parsedUrl.pathname);
    } catch (urlError) {
      console.error('URL parsing error:', urlError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Invalid DATABASE_URL format',
        urlError: urlError instanceof Error ? urlError.message : 'Unknown URL error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Database URL is valid',
      info: {
        protocol: parsedUrl.protocol,
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || 'default',
        database: parsedUrl.pathname,
        hasQuery: !!parsedUrl.search
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Debug error:', error);
    
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Debug failed',
      errorType: error instanceof Error ? error.constructor.name : 'Unknown'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}