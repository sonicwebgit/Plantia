import { validateSession, getSessionFromCookie } from './auth/utils';

export async function GET(request: Request): Promise<Response> {
  try {
    const cookieHeader = request.headers.get('cookie');
    const sessionId = getSessionFromCookie(cookieHeader || '');

    if (!sessionId) {
      return new Response(JSON.stringify({ 
        success: false, 
        user: null 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const user = await validateSession(sessionId);

    return new Response(JSON.stringify({ 
      success: true, 
      user: user ? {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image
      } : null
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Session validation error:', error);

    return new Response(JSON.stringify({ 
      success: false, 
      user: null 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}