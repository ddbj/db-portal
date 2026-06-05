import { http, HttpResponse } from "msw"
import type { LoaderFunctionArgs } from "react-router"
import { afterEach, beforeEach, describe, expect, test } from "vitest"

import {
  clearMatchAllFacetCache,
  getCachedMatchAllFacets,
} from "~/routes/search-results/facet-cache.server"
import { loader, type LoaderData } from "~/routes/search-results/loader"

import {
  crossSearchHandler,
  dbSearchHandler,
  minimalDbSearchResponse,
  minimalParseResponse,
  parseHandler,
} from "../mocks/handlers"
import { server } from "../mocks/server"

const buildLoader = (search: string, env?: string): Promise<LoaderData> => {
  const url = `http://localhost/search/results${search}`
  const request = new Request(url)
  if (env !== undefined) process.env.DB_PORTAL_SEARCH_API_URL = env

  return loader({ request, params: {}, context: {} } as LoaderFunctionArgs)
}

beforeEach(() => {
  delete process.env.DB_PORTAL_SEARCH_API_URL
  clearMatchAllFacetCache()
})

afterEach(() => {
  delete process.env.DB_PORTAL_SEARCH_API_URL
})

// The loader restores GUI state from a shared `?q=` and never fetches hits: the
// search runs client-side from the parsed AST (tested in the fetch-results suite).
describe("search-results loader: query restore", () => {
  test("emptyQuery_skipsParse_nullAst", async () => {
    let parseCalled = false
    server.use(
      http.get("*/db-portal/parse", () => {
        parseCalled = true

        return HttpResponse.json(minimalParseResponse("x"))
      }),
    )
    const data = await buildLoader("?q=")
    expect(parseCalled).toBe(false)
    expect(data.parseError).toBe(false)
    expect(data.ast).toBeNull()
  })

  test("validQuery_parsesToAst", async () => {
    server.use(parseHandler({ response: { ast: { op: "free_text", value: "cancer", is_phrase: false } } }))
    const data = await buildLoader("?q=cancer")
    expect(data.parseError).toBe(false)
    expect(data.ast).toMatchObject({ op: "free_text", value: "cancer" })
  })

  test("parseError_setsParseErrorFlag_nullAstAndFacets", async () => {
    server.use(
      http.get("*/db-portal/parse", () =>
        new HttpResponse(JSON.stringify({ type: "unexpected-token" }), {
          status: 400,
          headers: { "Content-Type": "application/problem+json" },
        }),
      ),
    )
    const data = await buildLoader("?q=:::invalid")
    expect(data.parseError).toBe(true)
    expect(data.ast).toBeNull()
    expect(data.facets).toBeNull()
  })
})

describe("search-results loader: facet placeholder", () => {
  test("coldCache_facetsPlaceholderIsNull", async () => {
    // Cold cache: the placeholder is null right away (the heavy match_all is never
    // awaited on the SSR path); a background fill warms the cache for next time.
    // Uses a scope distinct from the other cases so its fire-and-forget fill can't
    // race into their cache entries.
    server.use(
      dbSearchHandler({ response: minimalDbSearchResponse({ experimentType: [{ value: "X", count: 1 }] }) }),
    )
    const data = await buildLoader("?db=gea")
    expect(data.facets).toBeNull()
  })

  test("warmCache_returnsCachedMatchAllFacets", async () => {
    // Warm cache: the scope's cached match_all is returned synchronously as the
    // instant placeholder the sidebar shows before its q-aware counts land.
    const facets = { package: [{ value: "MIGS.ba", count: 5 }] }
    await getCachedMatchAllFacets("db:biosample", () => Promise.resolve(facets))
    server.use(dbSearchHandler())
    const data = await buildLoader("?db=biosample")
    expect(data.facets).toEqual(facets)
  })

  test("warmCrossCache_returnsCachedMatchAllFacets", async () => {
    const facets = { organism: [{ value: "9606", count: 500, label: "Homo sapiens" }] }
    await getCachedMatchAllFacets("cross", () => Promise.resolve(facets))
    server.use(crossSearchHandler())
    const data = await buildLoader("?q=")
    expect(data.facets).toEqual(facets)
  })
})
