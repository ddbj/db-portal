import { http, HttpResponse } from "msw"
import { describe, expect, test } from "vitest"

import { apiGet, apiPost, encodeQuery } from "~/lib/api/client"
import { APIError } from "~/lib/api/errors"

import { server } from "../../mocks/server"

const BASE = "https://api.test/search/api"

describe("encodeQuery", () => {
  test("encodeQuery_undefined_returnsEmpty", () => {
    expect(encodeQuery(undefined)).toBe("")
  })

  test("encodeQuery_empty_returnsEmpty", () => {
    expect(encodeQuery({})).toBe("")
  })

  test("encodeQuery_stringValue_returnsQuestionPrefixedString", () => {
    expect(encodeQuery({ q: "cancer" })).toBe("?q=cancer")
  })

  test("encodeQuery_skipsUndefinedAndNull", () => {
    expect(encodeQuery({ q: "x", topHits: undefined, db: null, page: 2 })).toBe("?q=x&page=2")
  })

  test("encodeQuery_arrayValue_emitsRepeatedKey", () => {
    expect(encodeQuery({ tag: ["a", "b"] })).toBe("?tag=a&tag=b")
  })

  test("encodeQuery_numberAndBooleanCoercedToString", () => {
    expect(encodeQuery({ n: 10, b: true })).toBe("?n=10&b=true")
  })

  test("encodeQuery_emptyStringValue_emitsKeyWithEmptyValue", () => {
    expect(encodeQuery({ k: "" })).toBe("?k=")
  })

  test("encodeQuery_emptyArray_returnsEmpty", () => {
    expect(encodeQuery({ tag: [] })).toBe("")
  })

  test("encodeQuery_specialCharactersInValue_areUrlEncoded", () => {
    expect(encodeQuery({ q: "cancer & tumor" })).toBe("?q=cancer+%26+tumor")
  })
})

describe("apiGet", () => {
  test("apiGet_responseOk_returnsJson", async () => {
    server.use(
      http.get(`${BASE}/db-portal/cross-search`, ({ request }) => {
        const url = new URL(request.url)
        expect(url.searchParams.get("q")).toBe("cancer")

        return HttpResponse.json({ databases: [] })
      }),
    )
    const result = await apiGet("/db-portal/cross-search", { baseUrl: BASE, query: { q: "cancer" } })
    expect(result).toEqual({ databases: [] })
  })

  test("apiGet_baseUrlWithTrailingSlash_normalizes", async () => {
    server.use(
      http.get(`${BASE}/db-portal/cross-search`, () => HttpResponse.json({ databases: [] })),
    )
    const result = await apiGet("/db-portal/cross-search", { baseUrl: `${BASE}/`, query: { q: "x" } })
    expect(result).toEqual({ databases: [] })
  })

  test("apiGet_responseError_throwsAPIError", async () => {
    server.use(
      http.get(`${BASE}/db-portal/search`, () =>
        HttpResponse.json(
          { type: "https://errors.test/missing-db", title: "Missing db", status: 400 },
          { status: 400, headers: { "content-type": "application/problem+json" } },
        ),
      ),
    )
    await expect(
      apiGet("/db-portal/search", { baseUrl: BASE, query: { q: "x" } }),
    ).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof APIError && err.status === 400 && err.title === "Missing db",
    )
  })

  test("apiGet_nonJsonResponse_returnsUndefined", async () => {
    server.use(
      http.get(`${BASE}/db-portal/cross-search`, () =>
        new HttpResponse("", { status: 200, headers: { "content-type": "text/plain" } }),
      ),
    )
    const result = await apiGet("/db-portal/cross-search", { baseUrl: BASE })
    expect(result).toBeUndefined()
  })

  test("apiGet_abortSignalAborted_throws", async () => {
    server.use(
      http.get(`${BASE}/db-portal/cross-search`, async () => {
        await new Promise((r) => setTimeout(r, 50))

        return HttpResponse.json({ databases: [] })
      }),
    )
    const ctrl = new AbortController()
    ctrl.abort()
    await expect(
      apiGet("/db-portal/cross-search", { baseUrl: BASE, signal: ctrl.signal }),
    ).rejects.toThrow()
  })
})

describe("apiPost", () => {
  test("apiPost_responseOk_sendsJsonBody", async () => {
    server.use(
      http.post(`${BASE}/db-portal/serialize`, async ({ request }) => {
        const body = await request.json() as Record<string, unknown>
        expect(body).toEqual({ ast: { op: "eq", field: "organism", value: "human" } })

        return HttpResponse.json({ dsl: "organism:human" })
      }),
    )
    const result = await apiPost(
      "/db-portal/serialize",
      { ast: { op: "eq", field: "organism", value: "human" } },
      { baseUrl: BASE },
    )
    expect(result).toEqual({ dsl: "organism:human" })
  })

  test("apiPost_responseError_throwsAPIError", async () => {
    server.use(
      http.post(`${BASE}/db-portal/serialize`, () =>
        HttpResponse.json(
          { type: "https://errors.test/invalid-ast", title: "Invalid AST", status: 400 },
          { status: 400, headers: { "content-type": "application/problem+json" } },
        ),
      ),
    )
    await expect(
      apiPost("/db-portal/serialize", { ast: { op: "AND", rules: [] } }, { baseUrl: BASE }),
    ).rejects.toBeInstanceOf(APIError)
  })

  test("apiPost_queryParameter_appendsToUrl", async () => {
    server.use(
      http.post(`${BASE}/db-portal/serialize`, ({ request }) => {
        const url = new URL(request.url)
        expect(url.searchParams.get("db")).toBe("bioproject")

        return HttpResponse.json({ dsl: "x" })
      }),
    )
    await apiPost(
      "/db-portal/serialize",
      { ast: { op: "free_text", value: "x" } },
      { baseUrl: BASE, query: { db: "bioproject" } },
    )
  })
})
