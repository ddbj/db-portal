import type { Request, Response } from "express"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import type { ServerEnv } from "../../../../server/lib/env"
import { makeHandleSearchAssistant } from "../../../../server/llm/assistant/route"
import type { LlmClient } from "../../../../server/llm/client"
import { createRateLimiter, setActiveRateLimiter } from "../../../../server/llm/rate-limit"
import { silentLogger } from "../../_helpers/silent-logger"

// makeHandleSearchAssistant only reads createLlmClient through the override hook,
// so env can stay a minimal stand-in for the unrelated downstream config.
const env = {} as unknown as ServerEnv

const availableClient = (): LlmClient => ({
  isAvailable: true,
  baseUrl: "http://llm.invalid",
  model: "test-model",
  apiKey: undefined,
  timeoutMs: 60_000,
  fetchImpl: vi.fn() as unknown as typeof fetch,
})

const unavailableClient = (): LlmClient => ({
  ...availableClient(),
  isAvailable: false,
})

type RecordedRes = {
  statusCode: number | undefined
  body: unknown
  headers: Record<string, string>
  writes: string[]
  setHeader: ReturnType<typeof vi.fn>
  status: ReturnType<typeof vi.fn>
  json: ReturnType<typeof vi.fn>
  write: ReturnType<typeof vi.fn>
  end: ReturnType<typeof vi.fn>
  on: ReturnType<typeof vi.fn>
}

const makeRes = (): RecordedRes => {
  const headers: Record<string, string> = {}
  const writes: string[] = []
  const res: RecordedRes = {
    statusCode: undefined,
    body: undefined,
    headers,
    writes,
    setHeader: vi.fn((name: string, value: string) => {
      headers[name] = value
    }),
    status: vi.fn((code: number) => {
      res.statusCode = code

      return res
    }),
    json: vi.fn((payload: unknown) => {
      res.body = payload

      return res
    }),
    write: vi.fn((chunk: string) => {
      writes.push(chunk)

      return true
    }),
    end: vi.fn(() => res),
    on: vi.fn(() => res),
  }

  return res
}

type ReqInit = { body?: unknown; cookie?: string; ip?: string }

const makeReq = (init: ReqInit = {}): Request =>
  ({
    body: init.body,
    headers: init.cookie === undefined ? {} : { cookie: init.cookie },
    ip: init.ip ?? "203.0.113.7",
    socket: { remoteAddress: init.ip ?? "203.0.113.7" },
  }) as unknown as Request

// SSE headers are written by openSseStream; their absence proves a guard
// short-circuited before the stream was opened.
const SSE_HEADERS = ["Content-Type", "Cache-Control", "X-Accel-Buffering", "Connection"]

const wroteSseHeaders = (res: RecordedRes): boolean =>
  res.headers["Content-Type"] === "text/event-stream"

const permissiveLimiter = () =>
  setActiveRateLimiter(createRateLimiter({ perIpPerMin: 1_000, perSessionPerMin: 1_000 }, () => 0))

const blockingLimiter = () =>
  setActiveRateLimiter(createRateLimiter({ perIpPerMin: 0, perSessionPerMin: 0 }, () => 0))

beforeEach(() => {
  // Active limiter is a module singleton with no reset; install a permissive
  // one per test so the limiter guard never blocks unless a test opts in.
  permissiveLimiter()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("makeHandleSearchAssistant guard: llm unavailable", () => {
  test("handleSearchAssistant_clientUnavailable_responds503LlmUnset", async () => {
    const handle = makeHandleSearchAssistant(env, silentLogger, { client: unavailableClient() })
    const res = makeRes()
    await handle(makeReq({ body: { input: "find cancer datasets" } }), res as unknown as Response)

    expect(res.statusCode).toBe(503)
    expect(res.body).toEqual({ error: "llm_unset" })
  })

  test("handleSearchAssistant_clientUnavailableWithInvalidBody_stillResponds503NotValidation", async () => {
    // The unavailable guard precedes body validation, so an invalid body must
    // not flip the response to 400.
    const handle = makeHandleSearchAssistant(env, silentLogger, { client: unavailableClient() })
    const res = makeRes()
    await handle(makeReq({ body: { input: "" } }), res as unknown as Response)

    expect(res.statusCode).toBe(503)
    expect(res.body).toEqual({ error: "llm_unset" })
  })

  test("handleSearchAssistant_clientUnavailable_doesNotReadRequestBody", async () => {
    // The unavailable guard runs before RequestBody.safeParse(req.body), so the
    // body property must never be accessed.
    const handle = makeHandleSearchAssistant(env, silentLogger, { client: unavailableClient() })
    const res = makeRes()
    const bodyAccess = vi.fn(() => ({ input: "x" }))
    const req = {
      get body() {
        return bodyAccess()
      },
      headers: {},
      ip: "203.0.113.7",
      socket: { remoteAddress: "203.0.113.7" },
    } as unknown as Request

    await handle(req, res as unknown as Response)

    expect(res.statusCode).toBe(503)
    expect(bodyAccess).not.toHaveBeenCalled()
  })

  test("handleSearchAssistant_clientUnavailable_doesNotOpenSseStream", async () => {
    const handle = makeHandleSearchAssistant(env, silentLogger, { client: unavailableClient() })
    const res = makeRes()
    await handle(makeReq({ body: { input: "ok" } }), res as unknown as Response)

    expect(wroteSseHeaders(res)).toBe(false)
    for (const header of SSE_HEADERS) {
      expect(res.headers[header]).toBeUndefined()
    }
    expect(res.write).not.toHaveBeenCalled()
  })
})

describe("makeHandleSearchAssistant guard: invalid body", () => {
  test("handleSearchAssistant_emptyInput_responds400InvalidRequest", async () => {
    const handle = makeHandleSearchAssistant(env, silentLogger, { client: availableClient() })
    const res = makeRes()
    await handle(makeReq({ body: { input: "" } }), res as unknown as Response)

    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({ error: "invalid_request" })
  })

  test("handleSearchAssistant_whitespaceOnlyInput_responds400InvalidRequest", async () => {
    // input is trimmed then required min(1), so whitespace collapses to empty.
    const handle = makeHandleSearchAssistant(env, silentLogger, { client: availableClient() })
    const res = makeRes()
    await handle(makeReq({ body: { input: "   " } }), res as unknown as Response)

    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({ error: "invalid_request" })
  })

  test("handleSearchAssistant_missingInputField_responds400InvalidRequest", async () => {
    const handle = makeHandleSearchAssistant(env, silentLogger, { client: availableClient() })
    const res = makeRes()
    await handle(makeReq({ body: { mode: "new" } }), res as unknown as Response)

    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({ error: "invalid_request" })
  })

  test("handleSearchAssistant_undefinedBody_responds400InvalidRequest", async () => {
    const handle = makeHandleSearchAssistant(env, silentLogger, { client: availableClient() })
    const res = makeRes()
    await handle(makeReq({ body: undefined }), res as unknown as Response)

    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({ error: "invalid_request" })
  })

  test("handleSearchAssistant_invalidBody_runsBeforeLimiter", async () => {
    // A blocking limiter is installed, yet validation precedes it: the response
    // must be 400, not 429.
    blockingLimiter()
    const handle = makeHandleSearchAssistant(env, silentLogger, { client: availableClient() })
    const res = makeRes()
    await handle(makeReq({ body: { input: "" } }), res as unknown as Response)

    expect(res.statusCode).toBe(400)
    expect(res.body).toEqual({ error: "invalid_request" })
    expect(res.headers["Retry-After"]).toBeUndefined()
  })

  test("handleSearchAssistant_invalidBody_doesNotOpenSseStream", async () => {
    const handle = makeHandleSearchAssistant(env, silentLogger, { client: availableClient() })
    const res = makeRes()
    await handle(makeReq({ body: { input: "" } }), res as unknown as Response)

    expect(wroteSseHeaders(res)).toBe(false)
    for (const header of SSE_HEADERS) {
      expect(res.headers[header]).toBeUndefined()
    }
    expect(res.write).not.toHaveBeenCalled()
  })
})

describe("makeHandleSearchAssistant guard: rate limited", () => {
  test("handleSearchAssistant_limiterBlocks_responds429WithErrorAndAxis", async () => {
    blockingLimiter()
    const handle = makeHandleSearchAssistant(env, silentLogger, { client: availableClient() })
    const res = makeRes()
    await handle(makeReq({ body: { input: "find cancer datasets" } }), res as unknown as Response)

    expect(res.statusCode).toBe(429)
    expect(res.body).toEqual({ error: "rate_limited", axis: "ip" })
  })

  test("handleSearchAssistant_limiterBlocks_setsRetryAfterHeader", async () => {
    blockingLimiter()
    const handle = makeHandleSearchAssistant(env, silentLogger, { client: availableClient() })
    const res = makeRes()
    await handle(makeReq({ body: { input: "find cancer datasets" } }), res as unknown as Response)

    expect(res.headers["Retry-After"]).toBeDefined()
    expect(Number(res.headers["Retry-After"])).toBeGreaterThan(0)
  })

  test("handleSearchAssistant_limiterBlocks_doesNotOpenSseStream", async () => {
    blockingLimiter()
    const handle = makeHandleSearchAssistant(env, silentLogger, { client: availableClient() })
    const res = makeRes()
    await handle(makeReq({ body: { input: "find cancer datasets" } }), res as unknown as Response)

    expect(wroteSseHeaders(res)).toBe(false)
    for (const header of SSE_HEADERS) {
      expect(res.headers[header]).toBeUndefined()
    }
    expect(res.write).not.toHaveBeenCalled()
  })

  test("handleSearchAssistant_limiterBlocks_setsRetryAfterBeforeSendingStatus", async () => {
    // openSseStream is never reached, so Retry-After is the only header on the
    // response and it sits on the 429.
    blockingLimiter()
    const handle = makeHandleSearchAssistant(env, silentLogger, { client: availableClient() })
    const res = makeRes()
    await handle(makeReq({ body: { input: "find cancer datasets" } }), res as unknown as Response)

    const setHeaderCalls = res.setHeader.mock.calls.map((c) => c[0])
    expect(setHeaderCalls).toEqual(["Retry-After"])
    expect(res.statusCode).toBe(429)
  })

  test("handleSearchAssistant_sessionLimitBlocks_reports429SessionAxis", async () => {
    // ip axis permissive, session axis exhausted: the axis surfaced in the body
    // must distinguish which limit fired.
    setActiveRateLimiter(createRateLimiter({ perIpPerMin: 1_000, perSessionPerMin: 0 }, () => 0))
    const handle = makeHandleSearchAssistant(env, silentLogger, { client: availableClient() })
    const res = makeRes()
    await handle(
      makeReq({ body: { input: "find cancer datasets" }, cookie: "sid=session-abc" }),
      res as unknown as Response,
    )

    expect(res.statusCode).toBe(429)
    expect(res.body).toEqual({ error: "rate_limited", axis: "session" })
  })
})

describe("makeHandleSearchAssistant guard ordering", () => {
  test("handleSearchAssistant_unavailableBeforeLimiter_responds503NotRateLimited", async () => {
    // Both the unavailable client and a blocking limiter would reject; the
    // earliest guard (503) must win.
    blockingLimiter()
    const handle = makeHandleSearchAssistant(env, silentLogger, { client: unavailableClient() })
    const res = makeRes()
    await handle(makeReq({ body: { input: "find cancer datasets" } }), res as unknown as Response)

    expect(res.statusCode).toBe(503)
    expect(res.body).toEqual({ error: "llm_unset" })
    expect(res.headers["Retry-After"]).toBeUndefined()
  })
})
