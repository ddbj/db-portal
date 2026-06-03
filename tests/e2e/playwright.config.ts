import { defineConfig, devices } from "@playwright/test"

import { USER_STORAGE_STATE } from "./fixtures/users"

const baseURL = process.env.DB_PORTAL_PORTAL_ORIGIN ?? "https://bsi-staging.nig.ac.jp"

export default defineConfig({
  testDir: ".",
  testMatch: /.*\.(spec|setup)\.ts$/,
  fullyParallel: true,
  // 外部依存 (staging app / ddbj-search-api / Keycloak / vLLM) のレイテンシは時折スパイク
  // し、重い検索ページの goto が "load" 到達前に timeout することがある。確定的な失敗は
  // 再試行でも落ち続けるので、transient な timeout だけを retry で吸収する。
  retries: process.env.CI ? 2 : 1,
  // 実ブラウザの 1 ページ読み込みは staging へ数十の sub-resource を一斉に要求する。
  // worker を増やすと複数ページ分の burst が単一 staging インスタンスを飽和させ、
  // navigation が "load" 到達前に stall する (goto が net::ERR_ABORTED で timeout)。
  // 安定して通すため逐次実行する。
  workers: 1,
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [["list"], ["html", { outputFolder: "../../playwright-report" }]],
  outputDir: "../../test-results",
  use: {
    baseURL,
    locale: "ja-JP",
    extraHTTPHeaders: { "Accept-Language": "ja" },
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
