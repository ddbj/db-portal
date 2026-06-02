import { describe, expect, test } from "vitest"

import type { ServerEnv } from "../../../../server/lib/env"
import { buildAssistantMessages } from "../../../../server/llm/assistant/prompt"
import { serializeAstToDsl } from "../../../../server/llm/assistant/search-api"

const env = { DB_PORTAL_SEARCH_API_URL: "https://search.test/api" } as unknown as ServerEnv

// serializeAstToDsl only crosses one external boundary (the search-api
// /db-portal/serialize endpoint). Stub fetch to drive every branch of the
// best-effort contract without touching the real function's internals.
const stubFetch = (
  impl: (url: string, init?: RequestInit) => Response,
): typeof fetch =>
  (async (url: string, init?: RequestInit) => impl(url, init)) as unknown as typeof fetch

const throwingFetch = (error: unknown): typeof fetch =>
  (async () => {
    throw error
  }) as unknown as typeof fetch

const ast = { op: "contains", field: "title", value: "cancer" }

describe("serializeAstToDsl", () => {
  test("okWithDslString_returnsThatString", async () => {
    const dsl = await serializeAstToDsl(ast, {
      env,
      fetchImpl: stubFetch(() => new Response(JSON.stringify({ dsl: "x" }), { status: 200 })),
    })
    expect(dsl).toBe("x")
  })

  test("okWithBlankDsl_returnsUndefined", async () => {
    const dsl = await serializeAstToDsl(ast, {
      env,
      fetchImpl: stubFetch(() => new Response(JSON.stringify({ dsl: "   " }), { status: 200 })),
    })
    expect(dsl).toBeUndefined()
  })

  test("okWithEmptyDsl_returnsUndefined", async () => {
    const dsl = await serializeAstToDsl(ast, {
      env,
      fetchImpl: stubFetch(() => new Response(JSON.stringify({ dsl: "" }), { status: 200 })),
    })
    expect(dsl).toBeUndefined()
  })

  test("okWithNonStringDsl_returnsUndefined", async () => {
    const dsl = await serializeAstToDsl(ast, {
      env,
      fetchImpl: stubFetch(() => new Response(JSON.stringify({ dsl: 123 }), { status: 200 })),
    })
    expect(dsl).toBeUndefined()
  })

  test("okWithMissingDsl_returnsUndefined", async () => {
    const dsl = await serializeAstToDsl(ast, {
      env,
      fetchImpl: stubFetch(() => new Response(JSON.stringify({}), { status: 200 })),
    })
    expect(dsl).toBeUndefined()
  })

  test("okWithNonEmptyDslSurroundedByWhitespace_returnsRawValue", async () => {
    // trim() gates whether a value counts as present, but the returned value is
    // the raw dsl field, not a trimmed copy.
    const dsl = await serializeAstToDsl(ast, {
      env,
      fetchImpl: stubFetch(() => new Response(JSON.stringify({ dsl: "  title:x  " }), { status: 200 })),
    })
    expect(dsl).toBe("  title:x  ")
  })

  test("nonOkResponse_returnsUndefined", async () => {
    const dsl = await serializeAstToDsl(ast, {
      env,
      fetchImpl: stubFetch(() => new Response(JSON.stringify({ dsl: "x" }), { status: 500 })),
    })
    expect(dsl).toBeUndefined()
  })

  test("badRequestResponse_returnsUndefined", async () => {
    const dsl = await serializeAstToDsl(ast, {
      env,
      fetchImpl: stubFetch(() => new Response(JSON.stringify({ dsl: "x" }), { status: 400 })),
    })
    expect(dsl).toBeUndefined()
  })

  test("fetchThrows_returnsUndefined", async () => {
    const dsl = await serializeAstToDsl(ast, {
      env,
      fetchImpl: throwingFetch(new Error("network down")),
    })
    expect(dsl).toBeUndefined()
  })

  test("invalidJsonBody_returnsUndefined", async () => {
    const dsl = await serializeAstToDsl(ast, {
      env,
      fetchImpl: stubFetch(() => new Response("not json", { status: 200 })),
    })
    expect(dsl).toBeUndefined()
  })

  test("postsAstAsJsonToSerializeEndpoint", async () => {
    let receivedUrl = ""
    let receivedInit: RequestInit | undefined
    await serializeAstToDsl(ast, {
      env,
      fetchImpl: stubFetch((url, init) => {
        receivedUrl = url
        receivedInit = init

        return new Response(JSON.stringify({ dsl: "title:cancer" }), { status: 200 })
      }),
    })
    expect(receivedUrl).toBe("https://search.test/api/db-portal/serialize")
    expect(receivedInit?.method).toBe("POST")
    expect(JSON.parse(String(receivedInit?.body))).toEqual({ ast })
  })

  test("trailingSlashBaseUrl_isNotDoubled", async () => {
    let receivedUrl = ""
    const slashEnv = { DB_PORTAL_SEARCH_API_URL: "https://search.test/api/" } as unknown as ServerEnv
    await serializeAstToDsl(ast, {
      env: slashEnv,
      fetchImpl: stubFetch((url) => {
        receivedUrl = url

        return new Response(JSON.stringify({ dsl: "title:cancer" }), { status: 200 })
      }),
    })
    expect(receivedUrl).toBe("https://search.test/api/db-portal/serialize")
  })
})

// The append prompt is only seeded with a "Current query:" line when the
// serialized DSL is a non-blank string. A degraded serialize (blank, missing,
// non-string, error) must fall back to fresh generation with no seed line.
describe("serializeAstToDsl seeds append prompt", () => {
  const seedLine = (currentDsl: string | undefined): string => {
    const messages = buildAssistantMessages({ userInput: "add rats", currentDsl })
    const last = messages.at(-1)
    if (last === undefined) throw new Error("expected a final user message")

    return last.content
  }

  test("realDslResult_seedsCurrentQueryLine", async () => {
    const currentDsl = await serializeAstToDsl(ast, {
      env,
      fetchImpl: stubFetch(() => new Response(JSON.stringify({ dsl: "title:cancer" }), { status: 200 })),
    })
    expect(seedLine(currentDsl)).toBe("Current query: title:cancer\nRequest: add rats")
  })

  test("blankDslResult_doesNotSeedCurrentQueryLine", async () => {
    const currentDsl = await serializeAstToDsl(ast, {
      env,
      fetchImpl: stubFetch(() => new Response(JSON.stringify({ dsl: "   " }), { status: 200 })),
    })
    expect(currentDsl).toBeUndefined()
    expect(seedLine(currentDsl)).toBe("add rats")
    expect(seedLine(currentDsl)).not.toContain("Current query:")
  })

  test("serializeFailureResult_doesNotSeedCurrentQueryLine", async () => {
    const currentDsl = await serializeAstToDsl(ast, {
      env,
      fetchImpl: throwingFetch(new Error("network down")),
    })
    expect(currentDsl).toBeUndefined()
    expect(seedLine(currentDsl)).not.toContain("Current query:")
  })
})
