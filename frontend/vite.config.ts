import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // In development, the browser talks to http://localhost:5173 only.
    // Vite forwards /api, /health and /uploads (images) to the backend, so cookies "just work" (same origin).
    proxy: {
      '/api': 'http://localhost:4000',
      '/health': 'http://localhost:4000',
      '/uploads': 'http://localhost:4000',
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
