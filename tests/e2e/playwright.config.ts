import { defineConfig, devices } from "@playwright/test"

import { USER_STORAGE_STATE } from "./fixtures/users"

const baseURL = process.env.DB_PORTAL_PORTAL_ORIGIN ?? "https://portal-staging.ddbj.nig.ac.jp"

export default defineConfig({
  testDir: ".",
  testMatch: /.*\.(spec|setup)\.ts$/,
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  ...(process.env.CI ? { workers: 1 } : {}),
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { outputFolder: "../../playwright-report" }]],
  outputDir: "../../test-results",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts$/,
    },
    {
      name: "anon",
      use: { ...devices["Desktop Chrome"] },
      testIgnore: [/auth\.setup\.ts$/, /user\.spec\.ts$/],
    },
    {
      name: "user",
      use: {
        ...devices["Desktop Chrome"],
        storageState: USER_STORAGE_STATE,
      },
      dependencies: ["setup"],
      testMatch: /user\.spec\.ts$/,
    },
  ],
})
