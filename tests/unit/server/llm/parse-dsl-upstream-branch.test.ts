import { describe, expect, test } from "vitest"

import type { ServerEnv } from "../../../../server/lib/env"
import { parseDslToAst } from "../../../../server/llm/assistant/search-api"

// parseDslToAst maps the upstream parse endpoint's response to a tagged outcome:
// a rejected grammar (400) is `invalid_dsl`, while any other failure to obtain a
// validated AST (5xx, an unexpected status, or a transport-level throw) collapses
// to `upstream`. These tests pin the 5xx / network-throw side and the
// invalid_dsl-vs-upstream boundary; the 200 / 400 cases live in assistant-parse.test.ts.

const env = { DB_PORTAL_SEARCH_API_URL: "https://search.test/api" } as unknown as ServerEnv

// A fetch stub that returns the given Response for any URL.
const respondWith = (response: Response): typeof fetch =>
  (async () => response) as unknown as typeof fetch

// A fetch stub that rejects, simulating a transport-level failure (DNS, reset,
// connection refused) before any HTTP status is seen.
const throwWith = (error: unknown): typeof fetch =>
  (async () => {
    throw error
  }) as unknown as typeof fetch

describe("parseDslToAst upstream branch", () => {
  test("status500_returnsUpstreamWithStatusMessage", async () => {
    const outcome = await parseDslToAst("title:cancer", {
      env,
      fetchImpl: respondWith(new Response("", { status: 500 })),
    })
    expect(outcome).toEqual({ ok: false, code: "upstream", message: "parse responded 500" })
  })

  test("status503_returnsUpstreamWithStatusMessage", async () => {
    const outcome = await parseDslToAst("title:cancer", {
      env,
      fetchImpl: respondWith(new Response("", { status: 503 })),
    })
    expect(outcome).toEqual({ ok: false, code: "upstream", message: "parse responded 503" })
  })

  test("status5xx_doesNotReadBodyForDetail", async () => {
    // A 5xx must not be treated as a grammar rejection: the message is derived
    // from the status code, never from a `detail` field in the body.
    const outcome = await parseDslToAst("title:cancer", {
      env,
      fetchImpl: respondWith(
        new Response(JSON.stringify({ detail: "unknown field 'foo'" }), { status: 502 }),
      ),
    })
    expect(outcome).toEqual({ ok: false, code: "upstream", message: "parse responded 502" })
  })

  test("networkThrowError_returnsUpstreamWithErrorMessage", async () => {
    const outcome = await parseDslToAst("title:cancer", {
      env,
      fetchImpl: throwWith(new Error("ECONNREFUSED 127.0.0.1:443")),
    })
    expect(outcome).toEqual({
      ok: false,
      code: "upstream",
      message: "ECONNREFUSED 127.0.0.1:443",
    })
  })

  test("networkThrowNonError_returnsUpstreamWithFallbackMessage", async () => {
    // A non-Error rejection (string, etc.) still maps to upstream, with a stable
    // fallback message rather than leaking the raw thrown value.
    const outcome = await parseDslToAst("title:cancer", {
      env,
      fetchImpl: throwWith("connection reset"),
    })
    expect(outcome).toEqual({ ok: false, code: "upstream", message: "parse failed" })
  })

  test("status400_returnsInvalidDsl_not_upstream", async () => {
    // The boundary: 400 is the only failure status that is a grammar rejection,
    // so the outcome must be invalid_dsl carrying the upstream `detail`, never
    // the upstream catch-all.
    const outcome = await parseDslToAst("foo:bar", {
      env,
      fetchImpl: respondWith(
        new Response(JSON.stringify({ detail: "unknown field 'foo'" }), { status: 400 }),
      ),
    })
    expect(outcome).toEqual({ ok: false, code: "invalid_dsl", message: "unknown field 'foo'" })
  })

  test("status400MalformedBody_returnsInvalidDslWithFallbackMessage", async () => {
    // A 400 whose body is not JSON still classifies as invalid_dsl (the grammar
    // rejected the query); only the human message falls back.
    const outcome = await parseDslToAst("foo:bar", {
      env,
      fetchImpl: respondWith(new Response("<html>bad request</html>", { status: 400 })),
    })
    expect(outcome).toEqual({ ok: false, code: "invalid_dsl", message: "invalid DSL" })
  })

  test("status401_returnsUpstream_not_invalidDsl", async () => {
    // A 4xx that is not 400 is an upstream problem, not a grammar rejection, so it
    // must not be mislabelled invalid_dsl. The exact message pins that distinction.
    const outcome = await parseDslToAst("title:cancer", {
      env,
      fetchImpl: respondWith(new Response("", { status: 401 })),
    })
    expect(outcome).toEqual({ ok: false, code: "upstream", message: "parse responded 401" })
  })

  test("status404_returnsUpstream_not_invalidDsl", async () => {
    const outcome = await parseDslToAst("title:cancer", {
      env,
      fetchImpl: respondWith(new Response("", { status: 404 })),
    })
    expect(outcome).toEqual({ ok: false, code: "upstream", message: "parse responded 404" })
  })

  test("status500BodyReadThrow_stillReturnsUpstream", async () => {
    // The 5xx branch must not depend on reading the body, so a body that would
    // throw on `.json()` must not turn a clean upstream outcome into a thrown
    // (and thus catch-mapped) one with a different message.
    const failingBody = new Response("", { status: 500 })
    Object.defineProperty(failingBody, "json", {
      value: () => {
        throw new Error("body already consumed")
      },
    })
    const outcome = await parseDslToAst("title:cancer", {
      env,
      fetchImpl: respondWith(failingBody),
    })
    expect(outcome).toEqual({ ok: false, code: "upstream", message: "parse responded 500" })
  })
})
