import { http, HttpResponse } from "msw"
import type { LoaderFunctionArgs } from "react-router"
import { afterEach, beforeEach, describe, expect, test } from "vitest"

import { loader, type LoaderData } from "~/routes/search-results/loader"

import {
  crossSearchHandler,
  dbSearchHandler,
  minimalCrossSearchResponse,
  minimalDbSearchResponse,
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

  test("crossSearch_facetsInResponse_propagatedToResult", async () => {
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
    const result = await (await buildLoader("?q=organism_id:9606")).results
    expect(result).toMatchObject({ kind: "cross", facets })
  })

  test("dbSearch_facetsInResponse_propagatedToResult", async () => {
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
    const result = await (await buildLoader("?q=organism_id:9606&db=biosample")).results
    expect(result).toMatchObject({ kind: "perDb", facets })
  })
})

describe("search-results loader: degrade", () => {
  test("emptyQuery_resolvesEmpty", async () => {
    const data = await buildLoader("?q=")
    expect(data.parseError).toBe(false)
    expect(await data.results).toEqual({ kind: "empty" })
  })

  test("crossSearch_apiReturnsNullFacets_resultFacetsNull", async () => {
    server.use(
      parseHandler(),
      crossSearchHandler({ response: minimalCrossSearchResponse(null) }),
    )
    const result = await (await buildLoader("?q=cancer")).results
    expect(result).toMatchObject({ kind: "cross", facets: null })
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
