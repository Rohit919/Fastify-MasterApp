import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    coverage: { provider: "v8", reporter: ["text", "lcov"] },
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      "@app/api-contracts": path.resolve(
        import.meta.dirname,
        "../../packages/api-contracts/src/index.ts",
      ),
    },
  },
});
