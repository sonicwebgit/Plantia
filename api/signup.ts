import { authDb } from '../_lib/db';
import { AuthError, createSession, createSessionCookie, validateEmail, validatePassword } from './auth/utils';

export async function POST(request: Request): Promise<Response> {
  try {
    const { email, password, name } = await request.json();

    // Validate input
    if (!email || !password || !name) {
      throw new AuthError('Email, password, and name are required', 400);
    }

    if (!validateEmail(email)) {
      throw new AuthError('Invalid email format', 400);
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      throw new AuthError(passwordValidation.message!, 400);
    }

    if (name.trim().length < 2) {
      throw new AuthError('Name must be at least 2 characters long', 400);
    }

    // Check if user already exists
    const existingUser = await authDb.getUserByEmail(email);
    if (existingUser) {
      throw new AuthError('User with this email already exists', 409);
    }

    // Create user
    const { user } = await authDb.createEmailUser(email, password, name.trim());

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
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': cookie
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    
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