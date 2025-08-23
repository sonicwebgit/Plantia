# Plantia Deployment Guide - Vercel with PostgreSQL

This guide will help you deploy Plantia to Vercel with PostgreSQL database support and Google OAuth authentication.

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Google Cloud Console**: Access to [console.cloud.google.com](https://console.cloud.google.com)
3. **Git Repository**: Your code should be in a Git repository (GitHub, GitLab, etc.)

## Step 1: Set Up PostgreSQL Database on Vercel

### Option A: Vercel Postgres (Recommended)
1. Go to your Vercel dashboard
2. Navigate to Storage tab
3. Click "Create Database" 
4. Select "Postgres"
5. Choose your database name (e.g., `plantia-db`)
6. Select your preferred region
7. Click "Create"

### Option B: External PostgreSQL Provider
You can also use external providers like:
- **Neon** (neon.tech) - Free tier available
- **Supabase** (supabase.com) - Free tier available  
- **Railway** (railway.app) - Free tier available
- **AWS RDS**, **Google Cloud SQL**, or **Azure Database**

## Step 2: Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing one
3. Enable the Google+ API:
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URIs:
     - For development: `http://localhost:5173/api/auth/google`
     - For production: `https://your-domain.vercel.app/api/auth/google`
5. Save the Client ID and Client Secret

## Step 3: Set Up Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings > Environment Variables
3. Add the following variables:

### Required Variables:
```
GEMINI_API_KEY=your_google_gemini_api_key
DATABASE_URL=your_postgresql_connection_string
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your_secure_random_string_32_chars_plus
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
```

### Getting the values:

**GEMINI_API_KEY**: 
- Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
- Create an API key for Gemini

**DATABASE_URL**: 
- From Vercel Postgres: Available in your database dashboard
- Format: `postgresql://username:password@hostname:port/database`

**NEXTAUTH_SECRET**: 
- Generate a secure random string (32+ characters)
- You can use: `openssl rand -base64 32`

**NEXTAUTH_URL**: 
- Your Vercel app URL (e.g., `https://plantia.vercel.app`)

## Step 4: Database Schema Setup

After setting up your PostgreSQL database, you need to run the schema migrations:

### Option A: Using Vercel CLI (Recommended)
```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel  
vercel login

# Link your project
vercel link

# Run database migration
vercel env pull .env.local
npm run db:migrate
```

### Option B: Manual SQL Execution
1. Connect to your PostgreSQL database using a client (pgAdmin, TablePlus, etc.)
2. Run the SQL commands from `api/_lib/schema.sql`

### Create Migration Script (Optional)
Add this script to your `package.json`:
```json
{
  "scripts": {
    "db:migrate": "node api/setup/migrate.ts"
  }
}
```

## Step 5: Deploy to Vercel

### Option A: Automatic Deployment (Recommended)
1. Connect your Git repository to Vercel:
   - Go to Vercel dashboard
   - Click "New Project"
   - Import your Git repository
   - Vercel will automatically detect it's a Vite project
2. Configure build settings (usually auto-detected):
   - Framework Preset: Vite
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Add environment variables (as described in Step 3)
4. Deploy

### Option B: Manual Deployment
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

## Step 6: Post-Deployment Setup

1. **Test Google OAuth**:
   - Visit your deployed app
   - Try signing up with Google
   - Verify the redirect works correctly

2. **Test Database Connection**:
   - Create a test plant
   - Verify data is saved to PostgreSQL
   - Check that data persists across sessions

3. **Update OAuth Redirect URLs**:
   - Go back to Google Cloud Console
   - Update OAuth redirect URLs with your production domain
   - Remove development URLs if no longer needed

## Step 7: Domain Configuration (Optional)

1. In Vercel dashboard, go to Settings > Domains
2. Add your custom domain
3. Update Google OAuth redirect URLs
4. Update NEXTAUTH_URL environment variable

## Troubleshooting

### Common Issues:

1. **OAuth Redirect Mismatch**:
   - Ensure redirect URLs in Google Console match exactly
   - Check for trailing slashes

2. **Database Connection Issues**:
   - Verify DATABASE_URL format
   - Check database is accessible from Vercel
   - Ensure schema is properly migrated

3. **Environment Variables**:
   - Verify all required variables are set
   - Check for typos in variable names
   - Ensure secrets are properly encoded

4. **CORS Issues**:
   - Check API routes are properly configured
   - Verify cookie settings for your domain

### Debugging:
- Check Vercel function logs in dashboard
- Use Vercel CLI: `vercel logs`
- Enable verbose logging in your environment

## Security Considerations

1. **Environment Variables**: Never commit secrets to Git
2. **Database Access**: Use connection pooling and prepared statements
3. **HTTPS**: Always use HTTPS in production
4. **Session Security**: Use secure, httpOnly cookies
5. **Rate Limiting**: Consider implementing rate limiting for auth endpoints

## Monitoring

Consider setting up:
1. **Vercel Analytics**: Monitor performance and usage
2. **Database Monitoring**: Track connection pool and query performance  
3. **Error Tracking**: Use services like Sentry for error monitoring
4. **Uptime Monitoring**: Monitor application availability

## Cost Optimization

1. **Database**: Choose appropriate instance size
2. **Vercel**: Monitor usage to stay within limits
3. **Caching**: Implement proper caching strategies
4. **Image Optimization**: Use Vercel's image optimization

Your Plantia app should now be deployed and fully functional with authentication and database persistence!