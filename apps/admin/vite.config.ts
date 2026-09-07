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
  build: {
    rollupOptions: {
      output: {
        // Split heavy, rarely-changing vendor code into its own chunks so the
        // app entry stays small and long-term-cacheable.
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'query-vendor': ['@tanstack/react-query'],
          charts: ['recharts'],
        },
      },
    },
  },
});
