import type { Request, Response as ExpressResponse } from "express"
import { beforeEach, describe, expect, test, vi } from "vitest"

import type { ServerEnv } from "../../../../server/lib/env"
import { makeHandleSearchAssistant } from "../../../../server/llm/assistant/route"
import type { LlmClient } from "../../../../server/llm/client"
import { createRateLimiter, setActiveRateLimiter } from "../../../../server/llm/rate-limit"
import { silentLogger } from "../../_helpers/silent-logger"

const env = {} as unknown as ServerEnv

const emptyBodyResponse = () =>
  new Response(new ReadableStream({ start(controller) { controller.close() } }), {
    status: 200,
    headers: { "content-type": "text/event-stream" },
  })

const clientWithFetch = (fetchImpl: ReturnType<typeof vi.fn>): LlmClient => ({
  isAvailable: true,
  baseUrl: "http://llm.invalid",
  model: "test-model",
  apiKey: undefined,
  timeoutMs: 60_000,
  fetchImpl: fetchImpl as unknown as typeof fetch,
})

const makeRes = () => {
  const headers: Record<string, string> = {}
  const writes: string[] = []
  const res = {
    statusCode: undefined as number | undefined,
    body: undefined as unknown,
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

const makeReq = (body: unknown): Request =>
  ({
    body,
    headers: {},
    ip: "203.0.113.7",
    socket: { remoteAddress: "203.0.113.7" },
  }) as unknown as Request

const userContent = (fetchImpl: ReturnType<typeof vi.fn>): string => {
  expect(fetchImpl).toHaveBeenCalledTimes(1)
  const init = fetchImpl.mock.calls[0]?.[1] as { body: string }
  const parsed = JSON.parse(init.body) as { messages: { role: string; content: string }[] }
  // Few-shot example の user message が複数並ぶので、 実 user input は最後の
  // user role message に入っている (server/llm/assistant/prompt.ts:124)。
  const userMessages = parsed.messages.filter((m) => m.role === "user")
  const last = userMessages.at(-1)
  expect(last, "user role message must exist in upstream payload").toBeDefined()

  return last!.content
}

beforeEach(() => {
  setActiveRateLimiter(createRateLimiter({ perIpPerMin: 1_000, perSessionPerMin: 1_000 }, () => 0))
  vi.clearAllMocks()
})

describe("makeHandleSearchAssistant PII redaction wiring", () => {
  test("handleSearchAssistant_emailInInput_doesNotLeakRawEmailToUpstreamPayload", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(emptyBodyResponse())
    const handle = makeHandleSearchAssistant(env, silentLogger, { client: clientWithFetch(fetchImpl) })
    await handle(
      makeReq({ input: "contact alice@example.com about cancer datasets" }),
      makeRes() as unknown as ExpressResponse,
    )

    const content = userContent(fetchImpl)
    expect(content).not.toContain("alice@example.com")
    expect(content).toContain("[REDACTED_EMAIL]")
  })

  test("handleSearchAssistant_luhnValidCardInInput_doesNotLeakRawDigitsToUpstreamPayload", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(emptyBodyResponse())
    const handle = makeHandleSearchAssistant(env, silentLogger, { client: clientWithFetch(fetchImpl) })
    await handle(
      makeReq({ input: "card 4111 1111 1111 1111 charged" }),
      makeRes() as unknown as ExpressResponse,
    )

    const content = userContent(fetchImpl)
    expect(content).not.toContain("4111 1111 1111 1111")
    expect(content).not.toMatch(/4111\D?1111\D?1111\D?1111/)
    expect(content).toContain("[REDACTED_CCNUM]")
  })

  test("handleSearchAssistant_apiKeyShapedTokenInInput_doesNotLeakRawTokenToUpstreamPayload", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(emptyBodyResponse())
    const handle = makeHandleSearchAssistant(env, silentLogger, { client: clientWithFetch(fetchImpl) })
    await handle(
      makeReq({ input: "token sk_live_AKIA0123456789ABCDEF in pipeline" }),
      makeRes() as unknown as ExpressResponse,
    )

    const content = userContent(fetchImpl)
    expect(content).not.toContain("sk_live_AKIA0123456789ABCDEF")
    expect(content).toContain("[REDACTED_TOKEN]")
  })

  test("handleSearchAssistant_phoneInInput_doesNotLeakRawPhoneToUpstreamPayload", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(emptyBodyResponse())
    const handle = makeHandleSearchAssistant(env, silentLogger, { client: clientWithFetch(fetchImpl) })
    await handle(
      makeReq({ input: "call +1-415-555-0199 about results" }),
      makeRes() as unknown as ExpressResponse,
    )

    const content = userContent(fetchImpl)
    expect(content).not.toContain("+1-415-555-0199")
    expect(content).toContain("[REDACTED_PHONE]")
  })

  test("handleSearchAssistant_cleanInput_passesThroughUnchanged", async () => {
    // Smoke: a benign input must survive redaction byte-for-byte (no false positives).
    const fetchImpl = vi.fn().mockResolvedValue(emptyBodyResponse())
    const handle = makeHandleSearchAssistant(env, silentLogger, { client: clientWithFetch(fetchImpl) })
    await handle(
      makeReq({ input: "RNA-seq human brain organoid datasets" }),
      makeRes() as unknown as ExpressResponse,
    )

    const content = userContent(fetchImpl)
    expect(content).toContain("RNA-seq human brain organoid datasets")
  })
})
