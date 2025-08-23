import { authDb } from '../_lib/db';
import { AuthError, createSession, createSessionCookie, validateEmail, validatePassword } from './auth/utils';

export async function POST(request: Request): Promise<Response> {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      throw new AuthError('Email and password are required', 400);
    }

    if (!validateEmail(email)) {
      throw new AuthError('Invalid email format', 400);
    }

    // Authenticate user
    const user = await authDb.authenticateEmailUser(email, password);
    if (!user) {
      throw new AuthError('Invalid email or password', 401);
    }

    // Create session
    const sessionId = await createSession(user);
    const cookie = createSessionCookie(sessionId);

    return new Response(JSON.stringify({ 
      success: true, 
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        image: user.image
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    
    if (error instanceof AuthError) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
      }), {
        status: error.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Internal server error' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}