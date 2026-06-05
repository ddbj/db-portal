import { http, HttpResponse } from "msw"
import type { LoaderFunctionArgs } from "react-router"
import { afterEach, beforeEach, describe, expect, test } from "vitest"

import type { CrossSearchResponse, DbSearchResponse } from "~/lib/api"
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

describe("search-results loader: exact match", () => {
  // A name-it lookup whose accession sits in a cross-search top hit. The lightweight
  // arm carries a thin title; the per-DB probe returns the full hit with a distinct
  // title + signature field, so the two are tellable apart in assertions.
  const lightweightCross: CrossSearchResponse = {
    databases: [{
      db: "bioproject",
      count: 1,
      error: null,
      hits: [{ identifier: "PRJDB1", type: "bioproject", title: "Light title" }],
    }],
    facets: null,
  }
  const fullHitResponse: DbSearchResponse = {
    total: 1,
    hits: [{ identifier: "PRJDB1", type: "bioproject", title: "Full title", projectType: ["genome"] }],
    hardLimitReached: false,
    page: 1,
    perPage: 5,
    hasNext: false,
    facets: null,
  }
  const freeTextParse = (value: string) =>
    parseHandler({ response: { ast: { op: "free_text", value, is_phrase: false } } })

  test("accessionMatch_fetchesFullHit", async () => {
    const probes: URL[] = []
    server.use(
      freeTextParse("PRJDB1"),
      crossSearchHandler({ response: lightweightCross }),
      dbSearchHandler({ response: fullHitResponse, onRequest: (url) => probes.push(url) }),
    )
    const result = await (await buildLoader("?q=PRJDB1")).results
    if (result.kind !== "cross") throw new Error("expected cross result")
    expect(result.exactMatch?.db).toBe("bioproject")
    expect(result.exactMatch?.hit.identifier).toBe("PRJDB1")
    // Full hit (from the probe), not the lightweight cross hit.
    expect(result.exactMatch?.hit.title).toBe("Full title")
    expect(probes).toHaveLength(1)
  })

  test("probeReturnsNoMatchingHit_fallsBackToLightweight", async () => {
    server.use(
      freeTextParse("PRJDB1"),
      crossSearchHandler({ response: lightweightCross }),
      dbSearchHandler({ response: minimalDbSearchResponse() }), // hits: []
    )
    const result = await (await buildLoader("?q=PRJDB1")).results
    if (result.kind !== "cross") throw new Error("expected cross result")
    expect(result.exactMatch?.hit.title).toBe("Light title")
  })

  test("probeFailure_fallsBackToLightweight", async () => {
    server.use(
      freeTextParse("PRJDB1"),
      crossSearchHandler({ response: lightweightCross }),
      http.get("*/db-portal/search", () => new HttpResponse(null, { status: 500 })),
    )
    const result = await (await buildLoader("?q=PRJDB1")).results
    if (result.kind !== "cross") throw new Error("expected cross result")
    expect(result.exactMatch?.hit.identifier).toBe("PRJDB1")
    expect(result.exactMatch?.hit.title).toBe("Light title")
  })

  test("noLookupMatch_noProbe_nullExactMatch", async () => {
    const probes: URL[] = []
    server.use(
      freeTextParse("zzz"),
      crossSearchHandler({ response: lightweightCross }),
      dbSearchHandler({ onRequest: (url) => probes.push(url) }),
    )
    const result = await (await buildLoader("?q=zzz")).results
    if (result.kind !== "cross") throw new Error("expected cross result")
    expect(result.exactMatch).toBeNull()
    expect(probes).toHaveLength(0)
  })

  test("structuredQuery_noProbe_nullExactMatch", async () => {
    const probes: URL[] = []
    server.use(
      parseHandler(), // minimal eq AST: not a plain lookup
      crossSearchHandler({ response: lightweightCross }),
      dbSearchHandler({ onRequest: (url) => probes.push(url) }),
    )
    const result = await (await buildLoader("?q=PRJDB1")).results
    if (result.kind !== "cross") throw new Error("expected cross result")
    expect(result.exactMatch).toBeNull()
    expect(probes).toHaveLength(0)
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
