import { describe, expect, test } from "vitest"

import { APIError } from "~/lib/api/errors"
import { createQueryClient, MAX_SERVER_ERROR_RETRIES, shouldRetry } from "~/lib/query"

describe("shouldRetry", () => {
  test("shouldRetry_500WithinLimit_returnsTrue", () => {
    expect(shouldRetry(0, new APIError({ status: 500 }))).toBe(true)
    expect(shouldRetry(1, new APIError({ status: 503 }))).toBe(true)
  })

  test("shouldRetry_500AtOrBeyondLimit_returnsFalse", () => {
    expect(shouldRetry(MAX_SERVER_ERROR_RETRIES, new APIError({ status: 502 }))).toBe(false)
    expect(shouldRetry(MAX_SERVER_ERROR_RETRIES + 1, new APIError({ status: 500 }))).toBe(false)
  })

  test("shouldRetry_4xx_returnsFalse", () => {
    expect(shouldRetry(0, new APIError({ status: 400 }))).toBe(false)
    expect(shouldRetry(0, new APIError({ status: 401 }))).toBe(false)
    expect(shouldRetry(0, new APIError({ status: 422 }))).toBe(false)
  })

  test("shouldRetry_boundary499vs500_distinguishesClientFromServer", () => {
    expect(shouldRetry(0, new APIError({ status: 499 }))).toBe(false)
    expect(shouldRetry(0, new APIError({ status: 500 }))).toBe(true)
  })

  test("shouldRetry_nonAPIError_returnsFalse", () => {
    expect(shouldRetry(0, new Error("network"))).toBe(false)
    expect(shouldRetry(0, "string error")).toBe(false)
    expect(shouldRetry(0, null)).toBe(false)
    expect(shouldRetry(0, undefined)).toBe(false)
  })
})

describe("createQueryClient", () => {
  test("createQueryClient_defaults_staleTime60sAndGcTime5m", () => {
    const qc = createQueryClient()
    const queries = qc.getDefaultOptions().queries
    expect(queries?.staleTime).toBe(60_000)
    expect(queries?.gcTime).toBe(5 * 60_000)
    expect(queries?.refetchOnWindowFocus).toBe(false)
  })

  test("createQueryClient_defaults_mutationsRetryZero", () => {
    const qc = createQueryClient()
    expect(qc.getDefaultOptions().mutations?.retry).toBe(0)
  })

  test("createQueryClient_defaults_retryDelegatesToShouldRetry", () => {
    const qc = createQueryClient()
    const retry = qc.getDefaultOptions().queries?.retry
    expect(typeof retry).toBe("function")
    const retryFn = retry as (count: number, error: unknown) => boolean
    expect(retryFn(0, new APIError({ status: 500 }))).toBe(true)
    expect(retryFn(0, new APIError({ status: 400 }))).toBe(false)
    expect(retryFn(MAX_SERVER_ERROR_RETRIES, new APIError({ status: 500 }))).toBe(false)
  })
})
