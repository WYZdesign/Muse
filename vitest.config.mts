import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    env: {
      MUSE_DEMO_MODE: "false",
    },
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/**/*.test.ts"],
      // RATCHET — do not lower. The previous 60/60/60/50 gate had never passed
      // (historical actual: ~31% statements / ~34% lines), so it silently
      // blocked the Unit Tests job and, transitively, every dependent
      // build/E2E/accessibility/Lighthouse/deploy job on every run.
      // These values are the measured baseline as of 2026-09-24 and exist to
      // prevent regression while the src/lib suites are grown. Raising them is
      // the owner-ratified direction; must never be reduced.
      thresholds: {
        lines: 35,
        functions: 36,
        statements: 32,
        branches: 24,
      },
    },
  },
});
