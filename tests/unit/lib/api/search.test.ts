import { http, HttpResponse } from "msw"
import { describe, expect, test } from "vitest"

import { APIError } from "~/lib/api/errors"
import { crossSearch, dbSearch, parseQuery, serializeAst } from "~/lib/api/search"

import { server } from "../../mocks/server"

const BASE = "https://api.test/search/api"

describe("crossSearch", () => {
  test("crossSearch_query_sendsGetWithParams", async () => {
    server.use(
      http.get(`${BASE}/db-portal/cross-search`, ({ request }) => {
        const url = new URL(request.url)
        expect(url.searchParams.get("q")).toBe("cancer")
        expect(url.searchParams.get("topHits")).toBe("5")

        return HttpResponse.json({ databases: [{ db: "bioproject", count: 12, error: null, hits: [] }] })
      }),
    )
    const result = await crossSearch({ q: "cancer", topHits: 5 }, { baseUrl: BASE })
    expect(result.databases).toHaveLength(1)
    expect(result.databases[0]?.db).toBe("bioproject")
  })
})

describe("dbSearch", () => {
  test("dbSearch_query_sendsGetWithParams", async () => {
    server.use(
      http.get(`${BASE}/db-portal/search`, ({ request }) => {
        const url = new URL(request.url)
        expect(url.searchParams.get("db")).toBe("sra")
        expect(url.searchParams.get("page")).toBe("2")
        expect(url.searchParams.get("perPage")).toBe("50")

        return HttpResponse.json({ total: 0, hits: [], pagination: { page: 2, perPage: 50, totalPages: 0 } })
      }),
    )
    const result = await dbSearch({ db: "sra", page: 2, perPage: 50 }, { baseUrl: BASE })
    expect(result.total).toBe(0)
  })
})

describe("parseQuery", () => {
  test("parseQuery_query_sendsGetWithQ", async () => {
    server.use(
      http.get(`${BASE}/db-portal/parse`, ({ request }) => {
        const url = new URL(request.url)
        expect(url.searchParams.get("q")).toBe("cancer")

        return HttpResponse.json({ ast: { op: "free_text", value: "cancer" } })
      }),
    )
    const result = await parseQuery({ q: "cancer" }, { baseUrl: BASE })
    expect(result.ast.op).toBe("free_text")
  })
})

describe("serializeAst", () => {
  test("serializeAst_body_sendsPostWithJsonBody", async () => {
    server.use(
      http.post(`${BASE}/db-portal/serialize`, async ({ request }) => {
        const body = await request.json() as Record<string, unknown>
        expect(body).toMatchObject({ ast: { op: "eq", field: "organism" } })

        return HttpResponse.json({ dsl: "organism:human" })
      }),
    )
    const result = await serializeAst(
      { ast: { op: "eq", field: "organism", value: "human" } },
      { baseUrl: BASE },
    )
    expect(result.dsl).toBe("organism:human")
  })

  test("serializeAst_dbQuery_appendsToUrl", async () => {
    server.use(
      http.post(`${BASE}/db-portal/serialize`, ({ request }) => {
        const url = new URL(request.url)
        expect(url.searchParams.get("db")).toBe("bioproject")

        return HttpResponse.json({ dsl: "x" })
      }),
    )
    await serializeAst(
      { ast: { op: "free_text", value: "x" } },
      { baseUrl: BASE, query: { db: "bioproject" } },
    )
  })
})

describe("search wrappers error paths", () => {
  test("crossSearch_500_throwsAPIError", async () => {
    server.use(
      http.get(`${BASE}/db-portal/cross-search`, () =>
        HttpResponse.json(
          { type: "https://errors.test/upstream", title: "Upstream Error", status: 502 },
          { status: 502, headers: { "content-type": "application/problem+json" } },
        ),
      ),
    )
    await expect(crossSearch({ q: "x" }, { baseUrl: BASE })).rejects.toBeInstanceOf(APIError)
  })

  test("dbSearch_400_throwsAPIErrorWithTitle", async () => {
    server.use(
      http.get(`${BASE}/db-portal/search`, () =>
        HttpResponse.json(
          { type: "https://errors.test/missing-db", title: "missing-db", status: 400 },
          { status: 400, headers: { "content-type": "application/problem+json" } },
        ),
      ),
    )
    await expect(dbSearch({ db: null }, { baseUrl: BASE })).rejects.toSatisfy(
      (err: unknown) => err instanceof APIError && err.status === 400 && err.title === "missing-db",
    )
  })

  test("parseQuery_500_throwsAPIError", async () => {
    server.use(
      http.get(`${BASE}/db-portal/parse`, () =>
        HttpResponse.json({ title: "boom" }, { status: 500 }),
      ),
    )
    await expect(parseQuery({ q: "x" }, { baseUrl: BASE })).rejects.toBeInstanceOf(APIError)
  })
})
