
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, (process as any).cwd(), '');

  return {
    plugins: [react()],
    server: {
      host: true, // Listen on all addresses (0.0.0.0) for LAN access
      port: parseInt(env.PORT || '3000'), // Configurable port via environment variable
    },
    define: {
      // Polyfill process.env for the client-side code
      'process.env.PHOTOROOM_API_KEY': JSON.stringify(env.PHOTOROOM_API_KEY),
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
    }
  };
});