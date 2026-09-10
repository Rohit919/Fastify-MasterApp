import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/__tests__/**/*.{test,spec}.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "node_modules/",
        "dist/",
        "**/__tests__/**",
        "*.config.ts",
        "**/*.d.ts",
        // Test harness/generated code — support code, not app code under test
        "src/core/testing/**",
        "src/generated/**",
        // Admin diagnostics — thin wrapper over privileged Prisma queries
        // and is exercised against a real database in higher-level tests.
        "src/modules/admin/**",
        // Bootstrap / infra wired-and-verified via integration, not unit tested
        "src/server.ts",
        "src/app.ts",
        "src/telemetry.ts",
        "src/secrets.ts",
        "src/plugins/**",
        // Queue producers/workers + circuit breaker — verified via live smoke,
        // not unit tests (they require Redis/external services).
        "src/queue/**",
        "src/workers/**",
        "src/core/circuit-breaker.ts",
        // Static HTML landing page
        "src/modules/root/**",
        "src/config/config.ts",
      ],
      // Regression ratchet: fail CI if coverage of the tested surface drops
      // below the current floor. Raise these as more of the codebase gains tests.
      // Current floor: ~76% statements, ~66% branches, ~75% functions, ~77% lines.
      thresholds: {
        statements: 73,
        branches: 66,
        functions: 58,
        lines: 73,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@core": path.resolve(import.meta.dirname, "./src/core"),
      "@modules": path.resolve(import.meta.dirname, "./src/modules"),
      "@plugins": path.resolve(import.meta.dirname, "./src/plugins"),
      "@app/api-contracts": path.resolve(
        import.meta.dirname,
        "../../packages/api-contracts/src/index.ts",
      ),
    },
  },
});
