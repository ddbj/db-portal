import { describe, expect, test } from "vitest"

import { parseServerEnv } from "../../../server/lib/env"

const baseEnv = {
  DB_PORTAL_ENV: "dev",
  DB_PORTAL_APP_INTERNAL_PORT: "3000",
  DB_PORTAL_PORTAL_ORIGIN: "http://localhost:3000",
  DB_PORTAL_LOG_LEVEL: "debug",
  DB_PORTAL_DEFAULT_LANG: "ja",
  DB_PORTAL_SEARCH_API_URL: "https://example.test/api",
  DB_PORTAL_SEARCH_API_TIMEOUT_MS: "10000",
  DB_PORTAL_OPENAPI_URL: "https://example.test/api/openapi.json",
  DB_PORTAL_KEYCLOAK_REALM_URL: "https://idp.example.test/realms/master",
  DB_PORTAL_KEYCLOAK_CLIENT_ID: "db-portal",
  DB_PORTAL_LLM_BASE_URL: "",
  DB_PORTAL_LLM_API_KEY: "",
  DB_PORTAL_LLM_MODEL: "Qwen/Qwen2.5-32B-Instruct-AWQ",
  DB_PORTAL_LLM_TIMEOUT_MS: "60000",
  DB_PORTAL_NEWS_MIRROR_REPO: "ddbj/www",
  DB_PORTAL_NEWS_MIRROR_BRANCH: "main",
  DB_PORTAL_NEWS_MIRROR_INTERVAL_SECONDS: "1800",
  DB_PORTAL_NEWS_MIRROR_GITHUB_TOKEN: "",
  DB_PORTAL_NEWS_CACHE_DIR: "/var/cache/db-portal/news",
} as const satisfies NodeJS.ProcessEnv

describe("parseServerEnv", () => {
  test("parseServerEnv_validEnv_coercesNumbersAndKeepsDefaults", () => {
    const parsed = parseServerEnv({ ...baseEnv })
    expect(parsed.DB_PORTAL_APP_INTERNAL_PORT).toBe(3000)
    expect(parsed.DB_PORTAL_SEARCH_API_TIMEOUT_MS).toBe(10000)
    expect(parsed.DB_PORTAL_LLM_BASE_URL).toBeUndefined()
    expect(parsed.DB_PORTAL_LOG_LEVEL).toBe("debug")
  })

  test("parseServerEnv_missingSearchApiUrl_throws", () => {
    const { DB_PORTAL_SEARCH_API_URL: _omit, ...rest } = baseEnv
    expect(() => parseServerEnv({ ...rest })).toThrow()
  })

  test("parseServerEnv_invalidLogLevel_throws", () => {
    expect(() => parseServerEnv({ ...baseEnv, DB_PORTAL_LOG_LEVEL: "verbose" })).toThrow()
  })

  test("parseServerEnv_invalidUrl_throws", () => {
    expect(() => parseServerEnv({ ...baseEnv, DB_PORTAL_PORTAL_ORIGIN: "not-a-url" })).toThrow()
  })
})
