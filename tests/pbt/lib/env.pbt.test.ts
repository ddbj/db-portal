import { fc, test } from "@fast-check/vitest"
import { expect } from "vitest"

import { parseServerEnv } from "../../../server/lib/env"

const baseEnv = {
  DB_PORTAL_ENV: "dev",
  DB_PORTAL_PORTAL_ORIGIN: "http://localhost:3000",
  DB_PORTAL_SEARCH_API_URL: "https://example.test/api",
  DB_PORTAL_OPENAPI_URL: "https://example.test/api/openapi.json",
  DB_PORTAL_KEYCLOAK_REALM_URL: "https://idp.example.test/realms/master",
  DB_PORTAL_KEYCLOAK_CLIENT_ID: "db-portal",
} as const

test.prop({ raw: fc.oneof(fc.string(), fc.constant(""), fc.constant(undefined)) })(
  "parseServerEnv_anyIntervalSeconds_fallsBackToDefaultWhenInvalid",
  ({ raw }) => {
    const env = parseServerEnv({
      ...baseEnv,
      DB_PORTAL_NEWS_MIRROR_INTERVAL_SECONDS: raw,
    } as NodeJS.ProcessEnv)
    const n = Number(raw)
    const expected = raw !== undefined && raw !== "" && Number.isFinite(n) ? n : 1800
    expect(env.DB_PORTAL_NEWS_MIRROR_INTERVAL_SECONDS).toBe(expected)
  },
)

test.prop({ raw: fc.oneof(fc.constant(""), fc.constant(undefined)) })(
  "parseServerEnv_emptyLlmKey_becomesUndefined",
  ({ raw }) => {
    const env = parseServerEnv({
      ...baseEnv,
      DB_PORTAL_LLM_API_KEY: raw,
    } as NodeJS.ProcessEnv)
    expect(env.DB_PORTAL_LLM_API_KEY).toBeUndefined()
  },
)

const isParsableUrl = (s: string): boolean => {
  try {
    new URL(s)

    return true
  } catch {
    return false
  }
}

test.prop({ origin: fc.string().filter((s) => !isParsableUrl(s)) })(
  "parseServerEnv_nonUrlOrigin_throws",
  ({ origin }) => {
    expect(() =>
      parseServerEnv({
        ...baseEnv,
        DB_PORTAL_PORTAL_ORIGIN: origin,
      } as NodeJS.ProcessEnv),
    ).toThrow()
  },
)
