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
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
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
      // RATCHET — may only go UP. Re-measured 2026-10-02 after the P2 type-clean
      // + normalizers/api/validate/component test additions:
      // 81.87 stmts / 70.75 branches / 86.98 funcs / 86.81 lines. Set just below
      // actual to prevent regression without being brittle.
      thresholds: {
        lines: 86,
        functions: 86,
        statements: 81,
        branches: 70,
      },
    },
  },
});
