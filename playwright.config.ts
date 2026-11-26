import { defineConfig, devices } from "@playwright/test";

// End-to-end tests against the local stack (`npm run setup:local` once, then `npm run e2e`).
// e2e/global-setup.ts resets the local database to fresh demo data first (skip with E2E_SKIP_DB_RESET=1).
// Set E2E_BASE_URL if your dev server isn't on http://localhost:3000.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  use: { baseURL, trace: "retain-on-failure", locale: "en-US" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : { command: "npm run dev", url: baseURL, reuseExistingServer: true, timeout: 120_000 },
});
