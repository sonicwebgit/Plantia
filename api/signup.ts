export async function POST(request: Request): Promise<Response> {
  try {
    const { name, email, password } = await request.json();
    
    if (!name || !email || !password) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Name, email and password are required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // For now, return error since we need database setup first
    return new Response(JSON.stringify({
      success: false,
      error: 'Database not set up yet. Please use /api/setup first.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid request'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}