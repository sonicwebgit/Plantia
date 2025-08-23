import { authDb } from '../_lib/db';
import { AuthError, createSession, createSessionCookie } from './auth/utils';

const GOOGLE_OAUTH_URL = 'https://accounts.google.com/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USER_INFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');

    if (!code) {
      // Redirect to Google OAuth
      const authUrl = new URL(GOOGLE_OAUTH_URL);
      authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
      authUrl.searchParams.set('redirect_uri', `${process.env.NEXTAUTH_URL}/api/auth/google`);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', 'openid email profile');
      authUrl.searchParams.set('state', 'google-login');

      return Response.redirect(authUrl.toString());
    }

    // Handle OAuth callback
    if (state !== 'google-login') {
      throw new AuthError('Invalid state parameter', 400);
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/auth/google`,
      }),
    });

    if (!tokenResponse.ok) {
      throw new AuthError('Failed to exchange code for tokens', 400);
    }

    const tokens = await tokenResponse.json();

    // Get user info from Google
    const userResponse = await fetch(GOOGLE_USER_INFO_URL, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new AuthError('Failed to fetch user info from Google', 400);
    }

    const googleUser = await userResponse.json();

    // Create or update user in database
    const user = await authDb.createOrUpdateGoogleUser(
      googleUser.id,
      googleUser.email,
      googleUser.name,
      googleUser.picture
    );

    // Create session
    const sessionId = await createSession(user);
    const cookie = createSessionCookie(sessionId);

    // Redirect to app with session cookie
    return new Response('Login successful! Redirecting...', {
      status: 302,
      headers: {
        'Location': process.env.NEXTAUTH_URL + '/',
        'Set-Cookie': cookie
      }
    });

  } catch (error) {
    console.error('Google OAuth error:', error);
    
    const errorMessage = error instanceof AuthError ? error.message : 'Authentication failed';
    const redirectUrl = `${process.env.NEXTAUTH_URL}/login?error=${encodeURIComponent(errorMessage)}`;
    
    return Response.redirect(redirectUrl);
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    // Initiate Google OAuth flow (for frontend to use)
    const authUrl = new URL(GOOGLE_OAUTH_URL);
    authUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID!);
    authUrl.searchParams.set('redirect_uri', `${process.env.NEXTAUTH_URL}/api/auth/google`);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('state', 'google-login');

    return new Response(JSON.stringify({ 
      success: true, 
      authUrl: authUrl.toString() 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Google OAuth initiation error:', error);

    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Failed to initiate Google OAuth' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}