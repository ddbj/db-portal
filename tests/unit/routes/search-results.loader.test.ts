import { http, HttpResponse } from "msw"
import type { LoaderFunctionArgs } from "react-router"
import { afterEach, beforeEach, describe, expect, test } from "vitest"

import { loader } from "~/routes/search-results/loader"

import {
  crossSearchHandler,
  dbSearchHandler,
  minimalCrossSearchResponse,
  minimalDbSearchResponse,
  parseHandler,
} from "../mocks/handlers"
import { server } from "../mocks/server"

const buildLoader = (search: string, env?: string): Promise<unknown> => {
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
    await buildLoader("?q=organism_id:9606")
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
    await buildLoader("?q=organism_id:9606&db=biosample")
    expect(capturedUrl?.searchParams.get("facetSelfExclude")).toBe("true")
  })

  test("crossSearch_facetsInResponse_propagatedToLoaderData", async () => {
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
    const data = await buildLoader("?q=organism_id:9606") as { facets: unknown }
    expect(data.facets).toEqual(facets)
  })

  test("dbSearch_facetsInResponse_propagatedToLoaderData", async () => {
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
    const data = await buildLoader("?q=organism_id:9606&db=biosample") as { facets: unknown }
    expect(data.facets).toEqual(facets)
  })
})

describe("search-results loader: degrade", () => {
  test("emptyQuery_returnsFacetsNull", async () => {
    const data = await buildLoader("?q=") as { facets: unknown; errorKey: unknown }
    expect(data.facets).toBeNull()
    expect(data.errorKey).toBeNull()
  })

  test("crossSearch_apiReturnsNullFacets_loaderDataFacetsNull", async () => {
    server.use(
      parseHandler(),
      crossSearchHandler({ response: minimalCrossSearchResponse(null) }),
    )
    const data = await buildLoader("?q=cancer") as { facets: unknown; errorKey: unknown }
    expect(data.facets).toBeNull()
    expect(data.errorKey).toBeNull()
  })

  test("parseError_returnsParseErrorKey", async () => {
    server.use(
      http.get("*/db-portal/parse", () =>
        new HttpResponse(JSON.stringify({ type: "unexpected-token" }), {
          status: 400,
          headers: { "Content-Type": "application/problem+json" },
        }),
      ),
    )
    const data = await buildLoader("?q=:::invalid") as { errorKey: unknown }
    expect(data.errorKey).toBe("parse")
  })

  test("crossSearch_networkError_returnsCrossErrorKey", async () => {
    server.use(
      parseHandler(),
      http.get("*/db-portal/cross-search", () => new HttpResponse(null, { status: 500 })),
    )
    const data = await buildLoader("?q=cancer") as { errorKey: unknown }
    expect(data.errorKey).toBe("cross")
  })

  test("dbSearch_networkError_returnsDbErrorKey", async () => {
    server.use(
      parseHandler(),
      http.get("*/db-portal/search", () => new HttpResponse(null, { status: 500 })),
    )
    const data = await buildLoader("?q=cancer&db=biosample") as { errorKey: unknown; hits: unknown }
    expect(data.errorKey).toBe("db")
  })
})
