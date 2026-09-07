import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/__tests__/**/*.{test,spec}.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/__tests__/**',
        '*.config.ts',
        '**/*.d.ts',
        // Test harness — support code, not app code under test
        'src/core/testing/**',
        // Scaffolds with no behaviour yet (placeholder modules)
        'src/modules/orders/**',
        // Bootstrap / infra wired-and-verified via integration, not unit tested
        'src/server.ts',
        'src/app.ts',
        'src/telemetry.ts',
        'src/plugins/**',
        // Static HTML landing page
        'src/modules/root/**',
        'src/config/config.ts',
      ],
      // Regression ratchet: fail CI if coverage of the tested surface drops
      // below the current floor. Raise these as more of the codebase gains tests.
      // Current: ~77% stmts/lines, ~78% branches, ~60% funcs.
      thresholds: {
        statements: 75,
        branches: 76,
        functions: 58,
        lines: 75,
      },
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@modules': path.resolve(__dirname, './src/modules'),
      '@plugins': path.resolve(__dirname, './src/plugins'),
      '@app/api-contracts': path.resolve(__dirname, '../../packages/api-contracts/src/index.ts'),
    },
  },
});
