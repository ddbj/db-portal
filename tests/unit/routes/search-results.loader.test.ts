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

describe("search-results loader: hits", () => {
  test("emptyQuery_cross_resolvesCross", async () => {
    server.use(crossSearchHandler())
    const data = await buildLoader("?q=")
    expect(data.parseError).toBe(false)
    expect(await data.results).toMatchObject({ kind: "cross" })
  })

  test("emptyQuery_cross_omitsQParam", async () => {
    let capturedUrl: URL | undefined
    server.use(crossSearchHandler({ onRequest: (url) => { capturedUrl = url } }))
    await (await buildLoader("?q=")).results
    expect(capturedUrl?.searchParams.has("q")).toBe(false)
  })

  test("emptyQuery_perDb_omitsQParam", async () => {
    const urls: URL[] = []
    server.use(dbSearchHandler({ onRequest: (url) => { urls.push(url) } }))
    await (await buildLoader("?db=biosample")).results
    expect(urls.length).toBeGreaterThan(0)
    expect(urls.every((u) => !u.searchParams.has("q"))).toBe(true)
  })

  test("hitsRequest_omitsFacets", async () => {
    // The hits request no longer carries facets; the sidebar pulls the aggregation
    // client-side (the facet param only appears on the match_all placeholder fill).
    let hitsUrl: URL | undefined
    server.use(
      parseHandler(),
      dbSearchHandler({
        onRequest: (url) => { if (!url.searchParams.has("facets")) hitsUrl = url },
      }),
    )
    await (await buildLoader("?q=cancer&db=biosample")).results
    expect(hitsUrl).toBeDefined()
    expect(hitsUrl?.searchParams.has("facets")).toBe(false)
  })

  test("emptyQuery_skipsParse", async () => {
    let parseCalled = false
    server.use(
      http.get("*/db-portal/parse", () => {
        parseCalled = true

        return HttpResponse.json(minimalParseResponse("x"))
      }),
      crossSearchHandler(),
    )
    const data = await buildLoader("?q=")
    await data.results
    expect(parseCalled).toBe(false)
    expect(data.parseError).toBe(false)
  })

  test("parseError_setsParseErrorFlag", async () => {
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
  })

  test("crossSearch_networkError_resolvesCrossError", async () => {
    server.use(
      parseHandler(),
      http.get("*/db-portal/cross-search", () => new HttpResponse(null, { status: 500 })),
    )
    const result = await (await buildLoader("?q=cancer")).results
    expect(result).toEqual({ kind: "error", errorKey: "cross" })
  })

  test("dbSearch_networkError_resolvesDbError", async () => {
    server.use(
      parseHandler(),
      http.get("*/db-portal/search", () => new HttpResponse(null, { status: 500 })),
    )
    const result = await (await buildLoader("?q=cancer&db=biosample")).results
    expect(result).toEqual({ kind: "error", errorKey: "db" })
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
