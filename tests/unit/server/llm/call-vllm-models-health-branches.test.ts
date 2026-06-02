import { describe, expect, test } from "vitest"

import { LlmHealth } from "../../../../app/schemas/api-bff/llm"
import { callVllmModels, type LlmClient } from "../../../../server/llm/client"

// callVllmModels drives the /api/llm/health contract: its reason strings are
// surfaced verbatim as LlmHealth.reason when status is "unreachable" (see
// server/llm/health.ts evaluate). These tests pin each reason branch.

const stubFetch = (impl: (url: string) => Response | Promise<Response>): typeof fetch =>
  (async (url: string) => impl(url)) as unknown as typeof fetch

const throwingFetch = (error: unknown): typeof fetch =>
  (async () => {
    throw error
  }) as unknown as typeof fetch

const makeClient = (overrides: Partial<LlmClient> = {}): LlmClient => ({
  isAvailable: true,
  baseUrl: "https://llm.test",
  model: "served-model",
  apiKey: undefined,
  timeoutMs: 1_000,
  fetchImpl: stubFetch(() => new Response("{}", { status: 200 })),
  ...overrides,
})

const modelsResponse = (data: unknown): Response =>
  new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  })

// LlmHealth only carries reason when status is "unreachable"; this asserts the
// reason is a valid value for that public contract surface.
const expectUnreachableReason = (reason: string): void => {
  expect(LlmHealth.parse({ status: "unreachable", reason })).toEqual({
    status: "unreachable",
    reason,
  })
}

describe("callVllmModels", () => {
  test("callVllmModels_noBaseUrl_returnsUnsetWithoutFetching", async () => {
    let called = false
    const client = makeClient({
      baseUrl: undefined,
      fetchImpl: stubFetch(() => {
        called = true

        return new Response("{}", { status: 200 })
      }),
    })

    const result = await callVllmModels(client)

    expect(result).toEqual({ ok: false, reason: "unset" })
    expect(called).toBe(false)
  })

  test("callVllmModels_non200Status_returnsStatusReason", async () => {
    const client = makeClient({
      fetchImpl: stubFetch(() => new Response("nope", { status: 503 })),
    })

    const result = await callVllmModels(client)

    expect(result).toEqual({ ok: false, reason: "status 503" })
    expectUnreachableReason("status 503")
  })

  test("callVllmModels_status404_reasonCarriesExactCode", async () => {
    const client = makeClient({
      fetchImpl: stubFetch(() => new Response("", { status: 404 })),
    })

    expect(await callVllmModels(client)).toEqual({ ok: false, reason: "status 404" })
  })

  test("callVllmModels_status200WithDataObjectNotArray_returnsInvalidModelsResponse", async () => {
    const client = makeClient({
      fetchImpl: stubFetch(() => modelsResponse({ id: "served-model" })),
    })

    const result = await callVllmModels(client)

    expect(result).toEqual({ ok: false, reason: "invalid models response" })
    expectUnreachableReason("invalid models response")
  })

  test("callVllmModels_status200WithoutDataField_returnsInvalidModelsResponse", async () => {
    const client = makeClient({
      fetchImpl: stubFetch(() => new Response(JSON.stringify({}), { status: 200 })),
    })

    expect(await callVllmModels(client)).toEqual({
      ok: false,
      reason: "invalid models response",
    })
  })

  test("callVllmModels_status200WithDataNull_returnsInvalidModelsResponse", async () => {
    const client = makeClient({
      fetchImpl: stubFetch(() => modelsResponse(null)),
    })

    expect(await callVllmModels(client)).toEqual({
      ok: false,
      reason: "invalid models response",
    })
  })

  test("callVllmModels_configuredModelMissingFromList_returnsNotServedReason", async () => {
    const client = makeClient({
      model: "served-model",
      fetchImpl: stubFetch(() => modelsResponse([{ id: "other-model" }, { id: "another" }])),
    })

    const result = await callVllmModels(client)

    expect(result).toEqual({ ok: false, reason: "model served-model not served" })
    expectUnreachableReason("model served-model not served")
  })

  test("callVllmModels_emptyModelList_returnsNotServedReason", async () => {
    const client = makeClient({
      model: "served-model",
      fetchImpl: stubFetch(() => modelsResponse([])),
    })

    expect(await callVllmModels(client)).toEqual({
      ok: false,
      reason: "model served-model not served",
    })
  })

  test("callVllmModels_entriesWithoutStringId_areNotMatched", async () => {
    // Only entries that are objects with a string `id` count toward "served".
    const client = makeClient({
      model: "served-model",
      fetchImpl: stubFetch(() =>
        modelsResponse([
          "served-model",
          { id: 123 },
          null,
          { name: "served-model" },
        ])),
    })

    expect(await callVllmModels(client)).toEqual({
      ok: false,
      reason: "model served-model not served",
    })
  })

  test("callVllmModels_configuredModelPresent_returnsOk", async () => {
    const client = makeClient({
      model: "served-model",
      fetchImpl: stubFetch(() => modelsResponse([{ id: "noise" }, { id: "served-model" }])),
    })

    expect(await callVllmModels(client)).toEqual({ ok: true })
  })

  test("callVllmModels_fetchThrowsError_returnsErrorMessageAsReason", async () => {
    const client = makeClient({
      fetchImpl: throwingFetch(new Error("connect ECONNREFUSED")),
    })

    const result = await callVllmModels(client)

    expect(result).toEqual({ ok: false, reason: "connect ECONNREFUSED" })
    expectUnreachableReason("connect ECONNREFUSED")
  })

  test("callVllmModels_fetchThrowsNonError_returnsNetworkErrorReason", async () => {
    const client = makeClient({
      fetchImpl: throwingFetch("string failure"),
    })

    expect(await callVllmModels(client)).toEqual({ ok: false, reason: "network error" })
  })

  test("callVllmModels_targetsModelsEndpointWithTrailingSlashTrimmed", async () => {
    let requestedUrl = ""
    const client = makeClient({
      baseUrl: "https://llm.test/",
      model: "served-model",
      fetchImpl: stubFetch((url) => {
        requestedUrl = url

        return modelsResponse([{ id: "served-model" }])
      }),
    })

    await callVllmModels(client)

    expect(requestedUrl).toBe("https://llm.test/v1/models")
  })

  test("callVllmModels_apiKeySet_sendsBearerAuthorizationHeader", async () => {
    let authHeader: string | null = "absent"
    const client = makeClient({
      apiKey: "secret-token",
      model: "served-model",
      fetchImpl: ((_url: string, init?: RequestInit) => {
        const headers = new Headers(init?.headers)
        authHeader = headers.get("Authorization")

        return Promise.resolve(modelsResponse([{ id: "served-model" }]))
      }) as unknown as typeof fetch,
    })

    await callVllmModels(client)

    expect(authHeader).toBe("Bearer secret-token")
  })
})
