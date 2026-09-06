import { defineConfig } from 'tsup';
import { resolve } from 'path';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  target: 'node20',
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  shims: true,
  dts: true,
  external: ['@prisma/client'],
  esbuildOptions(options) {
    // Resolve TypeScript path aliases at build time
    options.alias = {
      '@': resolve(__dirname, './src'),
      '@core': resolve(__dirname, './src/core'),
      '@services': resolve(__dirname, './src/services'),
      '@routes': resolve(__dirname, './src/routes'),
      '@plugins': resolve(__dirname, './src/plugins'),
      '@utils': resolve(__dirname, './src/utils'),
    };
  },
});
