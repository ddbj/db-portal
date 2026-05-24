import { defineConfig, devices } from "@playwright/test"

const baseURL = process.env.DB_PORTAL_PORTAL_ORIGIN ?? "https://portal-staging.ddbj.nig.ac.jp"

export default defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { outputFolder: "../../playwright-report" }]],
  outputDir: "../../test-results",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
})
