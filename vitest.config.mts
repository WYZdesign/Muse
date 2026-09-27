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
      // The first coverage push toward the owner's 60% goal (2026-09-27) added
      // real suites for the biggest/lowest-covered src/lib modules — measured
      // actual after that push: ~81% statements / ~70% branches / ~86%
      // functions / ~86% lines. These values sit just below that measured
      // baseline and exist to prevent regression. They may only go UP.
      thresholds: {
        lines: 84,
        functions: 84,
        statements: 78,
        branches: 65,
      },
    },
  },
});
