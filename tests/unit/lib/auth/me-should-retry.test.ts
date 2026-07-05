import { describe, expect, test } from "vitest"

import { APIError } from "~/lib/api/errors"
import { meShouldRetry } from "~/lib/auth/use-auth"

const ME_RETRY_LIMIT = 2

describe("meShouldRetry — /api/me transient failure policy", () => {
  test("meShouldRetry_5xxAPIErrorWithinLimit_returnsTrue", () => {
    expect(meShouldRetry(0, new APIError({ status: 500 }))).toBe(true)
    expect(meShouldRetry(1, new APIError({ status: 503 }))).toBe(true)
  })

  test("meShouldRetry_5xxAPIErrorAtLimit_returnsFalse", () => {
    expect(meShouldRetry(ME_RETRY_LIMIT, new APIError({ status: 500 }))).toBe(false)
  })

  test("meShouldRetry_4xxAPIError_returnsFalse", () => {
    expect(meShouldRetry(0, new APIError({ status: 400 }))).toBe(false)
    expect(meShouldRetry(0, new APIError({ status: 403 }))).toBe(false)
  })

  test("meShouldRetry_networkLikeTypeErrorWithinLimit_returnsTrue", () => {
    // ネットワーク切断時 fetch は TypeError で reject する。 これを global の
    // shouldRetry はカバーしておらず loading 永続化の原因になっていた。
    expect(meShouldRetry(0, new TypeError("Failed to fetch"))).toBe(true)
    expect(meShouldRetry(1, new TypeError("Failed to fetch"))).toBe(true)
  })

  test("meShouldRetry_networkLikeTypeErrorAtLimit_returnsFalse", () => {
    expect(meShouldRetry(ME_RETRY_LIMIT, new TypeError("Failed to fetch"))).toBe(false)
  })

  test("meShouldRetry_abortError_returnsFalse", () => {
    // 意図的中断 (component unmount / navigation) は retry しない。
    const err = new Error("aborted")
    err.name = "AbortError"
    expect(meShouldRetry(0, err)).toBe(false)
  })

  test("meShouldRetry_plainErrorWithinLimit_returnsTrue", () => {
    expect(meShouldRetry(0, new Error("oops"))).toBe(true)
  })
})
