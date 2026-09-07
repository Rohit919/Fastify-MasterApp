import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@app/api-contracts': path.resolve(__dirname, '../../packages/api-contracts/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls to the Fastify server during development
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
