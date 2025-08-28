export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  
  if (!code) {
    // Redirect to Google OAuth
    const googleAuthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    googleAuthUrl.searchParams.set('client_id', process.env.GOOGLE_CLIENT_ID || '');
    googleAuthUrl.searchParams.set('redirect_uri', `${url.origin}/api/auth/google`);
    googleAuthUrl.searchParams.set('response_type', 'code');
    googleAuthUrl.searchParams.set('scope', 'openid email profile');
    
    return Response.redirect(googleAuthUrl.toString());
  }
  
  try {
    // Exchange code for token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID || '',
        client_secret: process.env.GOOGLE_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${url.origin}/api/auth/google`,
      }),
    });
    
    const tokens = await tokenResponse.json();
    
    if (!tokens.access_token) {
      throw new Error('No access token received');
    }
    
    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    
    const userInfo = await userResponse.json();
    
    // For now, just redirect to app with success
    // TODO: Create user in database and create session
    const redirectUrl = new URL(url.origin);
    redirectUrl.searchParams.set('auth', 'success');
    redirectUrl.searchParams.set('email', userInfo.email);
    
    return Response.redirect(redirectUrl.toString());
    
  } catch (error) {
    console.error('Google auth error:', error);
    const redirectUrl = new URL(url.origin);
    redirectUrl.searchParams.set('auth', 'error');
    return Response.redirect(redirectUrl.toString());
  }
}