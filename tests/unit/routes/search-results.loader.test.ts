import { http, HttpResponse } from "msw"
import type { LoaderFunctionArgs } from "react-router"
import { afterEach, beforeEach, describe, expect, test } from "vitest"

import { clearMatchAllFacetCache } from "~/routes/search-results/facet-cache.server"
import { loader, type LoaderData } from "~/routes/search-results/loader"

import {
  crossSearchHandler,
  dbSearchHandler,
  minimalCrossSearchResponse,
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

describe("search-results loader: facetSelfExclude", () => {
  test("crossSearch_withFacets_sendsFacetSelfExcludeTrue", async () => {
    let capturedUrl: URL | undefined
    server.use(
      parseHandler(),
      crossSearchHandler({
        onRequest: (url) => { capturedUrl = url },
        response: minimalCrossSearchResponse({
          organism: [
            { value: "9606", count: 100, label: "Homo sapiens" },
            { value: "10090", count: 50, label: "Mus musculus" },
          ],
        }),
      }),
    )
    const data = await buildLoader("?q=organism_id:9606")
    await data.results
    expect(capturedUrl?.searchParams.get("facetSelfExclude")).toBe("true")
  })

  test("dbSearch_withFacets_sendsFacetSelfExcludeTrue", async () => {
    let capturedUrl: URL | undefined
    server.use(
      parseHandler(),
      dbSearchHandler({
        onRequest: (url) => { capturedUrl = url },
        response: minimalDbSearchResponse({
          organism: [
            { value: "9606", count: 100, label: "Homo sapiens" },
            { value: "10090", count: 50, label: "Mus musculus" },
          ],
        }),
      }),
    )
    const data = await buildLoader("?q=organism_id:9606&db=biosample")
    await data.results
    expect(capturedUrl?.searchParams.get("facetSelfExclude")).toBe("true")
  })

  test("crossSearch_facetsInResponse_resolvedThroughFacetsDeferred", async () => {
    const facets = {
      organism: [
        { value: "9606", count: 500, label: "Homo sapiens" },
        { value: "10090", count: 200, label: "Mus musculus" },
      ],
    }
    server.use(
      parseHandler(),
      crossSearchHandler({ response: minimalCrossSearchResponse(facets) }),
    )
    const data = await buildLoader("?q=organism_id:9606")
    expect(await data.results).toMatchObject({ kind: "cross" })
    expect(await data.facets).toEqual(facets)
  })

  test("dbSearch_facetsInResponse_resolvedThroughFacetsDeferred", async () => {
    const facets = {
      accessibility: [
        { value: "public-access", count: 300 },
        { value: "controlled-access", count: 20 },
      ],
    }
    server.use(
      parseHandler(),
      dbSearchHandler({ response: minimalDbSearchResponse(facets) }),
    )
    const data = await buildLoader("?q=organism_id:9606&db=biosample")
    expect(await data.results).toMatchObject({ kind: "perDb" })
    expect(await data.facets).toEqual(facets)
  })
})

describe("search-results loader: degrade", () => {
  test("crossSearch_apiReturnsNullFacets_facetsResolveNull", async () => {
    server.use(
      parseHandler(),
      crossSearchHandler({ response: minimalCrossSearchResponse(null) }),
    )
    const data = await buildLoader("?q=cancer")
    expect(await data.results).toMatchObject({ kind: "cross" })
    expect(await data.facets).toBeNull()
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

describe("search-results loader: empty query runs match_all", () => {
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
    const data = await buildLoader("?db=biosample")
    await Promise.all([data.results, data.facets])
    expect(urls.length).toBeGreaterThan(0)
    expect(urls.every((u) => !u.searchParams.has("q"))).toBe(true)
  })

  test("emptyQuery_perDb_fetchesHitsWithoutFacets_andFacetsSeparately", async () => {
    const urls: URL[] = []
    server.use(dbSearchHandler({ onRequest: (url) => { urls.push(url) } }))
    const data = await buildLoader("?db=biosample")
    await Promise.all([data.results, data.facets])
    expect(urls.some((u) => !u.searchParams.has("facets"))).toBe(true)
    expect(urls.some((u) => u.searchParams.has("facets"))).toBe(true)
  })

  test("emptyQuery_perDb_facetsResolveThroughDeferred", async () => {
    const facets = { package: [{ value: "MIGS.ba.6.0", count: 100 }] }
    server.use(dbSearchHandler({ response: minimalDbSearchResponse(facets) }))
    const data = await buildLoader("?db=biosample")
    expect(await data.facets).toEqual(facets)
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

  test("emptyQuery_perDb_cachesFacetAggregation_acrossRequests", async () => {
    let facetRequests = 0
    server.use(
      dbSearchHandler({
        onRequest: (url) => { if (url.searchParams.has("facets")) facetRequests += 1 },
        response: minimalDbSearchResponse({ package: [{ value: "MIGS.ba", count: 5 }] }),
      }),
    )
    const first = await buildLoader("?db=biosample")
    await Promise.all([first.results, first.facets])
    const second = await buildLoader("?db=biosample")
    await Promise.all([second.results, second.facets])
    expect(facetRequests).toBe(1)
    expect(await second.facets).toEqual({ package: [{ value: "MIGS.ba", count: 5 }] })
  })
})
