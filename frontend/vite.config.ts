/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
  build: {
    // Split heavy vendor code so the entry chunk stays small and cacheable;
    // route pages are already lazy-loaded separately.
    rolldownOptions: {
      output: {
        manualChunks(id: string) {
          if (id.includes('node_modules/@stellar')) return 'vendor-stellar';
          if (id.includes('node_modules/@sentry')) return 'vendor-sentry';
          if (
            id.includes('node_modules/react') ||
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react-router')
          ) {
            return 'vendor-react';
          }
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
