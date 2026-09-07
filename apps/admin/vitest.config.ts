import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

/**
 * Test config. Reuses the app's path aliases so tests import modules exactly
 * as the app does, runs in jsdom, and loads a setup file that wires
 * jest-dom matchers + a stub i18n.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@app/api-contracts': path.resolve(__dirname, '../../packages/api-contracts/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    css: false,
    restoreMocks: true,
    clearMocks: true,
  },
});
