import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 30000,
  retries: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL || "https://muse.wyzdesign.com",
    headless: true,
    viewport: { width: 390, height: 844 },
    actionTimeout: 10000,
  },
  reporter: [["list"]],
});
