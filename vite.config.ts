import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.DATABASE_URL': JSON.stringify(env.DATABASE_URL),
        'process.env.NEXTAUTH_URL': JSON.stringify(env.NEXTAUTH_URL),
        'process.env.NEXTAUTH_SECRET': JSON.stringify(env.NEXTAUTH_SECRET),
        'process.env.GOOGLE_CLIENT_ID': JSON.stringify(env.GOOGLE_CLIENT_ID),
        'process.env.GOOGLE_CLIENT_SECRET': JSON.stringify(env.GOOGLE_CLIENT_SECRET)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      server: {
        proxy: {
          '/api': {
            target: 'http://localhost:3000',
            changeOrigin: true,
            secure: false
          }
        }
      }
    };
});
