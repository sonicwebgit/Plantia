import { deleteSession, clearSessionCookie, getSessionFromCookie } from './auth/utils';

export async function POST(request: Request): Promise<Response> {
  try {
    const cookieHeader = request.headers.get('cookie');
    const sessionId = getSessionFromCookie(cookieHeader || '');

    if (sessionId) {
      await deleteSession(sessionId);
    }

    const clearCookie = clearSessionCookie();

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Logged out successfully' 
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': clearCookie
      }
    });

  } catch (error) {
    console.error('Logout error:', error);

    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}