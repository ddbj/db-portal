import { http, HttpResponse } from "msw"
import { afterEach, beforeEach, describe, expect, test } from "vitest"

import { fetchSearchResults, identityAst, type SearchParams } from "~/features/search"
import type { CrossSearchResponse, DbSearchResponse, ParseNode } from "~/lib/api"

import {
  crossSearchByAstHandler,
  dbSearchByAstHandler,
  minimalCrossSearchByAstResponse,
  minimalDbSearchByAstResponse,
} from "../../../mocks/handlers"
import { server } from "../../../mocks/server"

const BASE = "http://search.test"
const PARAMS: SearchParams = { page: 1, perPage: 20, sort: "relevance" }
const lookupAst: ParseNode = { op: "free_text", value: "PRJDB1", is_phrase: false }

beforeEach(() => {
  server.use(crossSearchByAstHandler(), dbSearchByAstHandler())
})

afterEach(() => server.resetHandlers())

describe("fetchSearchResults: request shaping", () => {
  test("identityAst_postsEmptyBody_matchAll", async () => {
    let body: unknown
    server.use(
      crossSearchByAstHandler({
        response: minimalCrossSearchByAstResponse(""),
        onRequest: (_url, posted) => { body = posted },
      }),
    )
    const out = await fetchSearchResults(null, identityAst, PARAMS, BASE)
    // An empty query posts no `ast`: the server reads match_all and echoes dsl "".
    expect(body).toEqual({})
    expect(out.dsl).toBe("")
    expect(out.result.kind).toBe("cross")
  })

  test("nonIdentityAst_postsAst_andSelfExcludingFacets", async () => {
    let url: URL | undefined
    let body: { ast?: unknown } = {}
    server.use(
      crossSearchByAstHandler({ onRequest: (u, posted) => { url = u; body = posted as { ast?: unknown } } }),
    )
    await fetchSearchResults(null, lookupAst, PARAMS, BASE)
    expect(body.ast).toMatchObject({ op: "free_text", value: "PRJDB1" })
    expect(url?.searchParams.get("topHits")).toBe("3")
    // The hits and their q-aware facets ride one request, self-excluded for multi-select.
    expect(url?.searchParams.get("facetSelfExclude")).toBe("true")
    expect(url?.searchParams.get("facets")).not.toBeNull()
  })

  test("perDb_passesPagingAndSort", async () => {
    let url: URL | undefined
    server.use(dbSearchByAstHandler({ onRequest: (u) => { url = u } }))
    await fetchSearchResults("biosample", lookupAst, { page: 2, perPage: 50, sort: "date_desc" }, BASE)
    expect(url?.searchParams.get("db")).toBe("biosample")
    expect(url?.searchParams.get("page")).toBe("2")
    expect(url?.searchParams.get("perPage")).toBe("50")
    expect(url?.searchParams.get("sort")).toBe("datePublished:desc")
  })

  test("relevanceSort_omitsSortParam", async () => {
    let url: URL | undefined
    server.use(dbSearchByAstHandler({ onRequest: (u) => { url = u } }))
    await fetchSearchResults("biosample", lookupAst, PARAMS, BASE)
    expect(url?.searchParams.has("sort")).toBe(false)
  })
})

describe("fetchSearchResults: payload", () => {
  test("crossResponse_carriesDslAndFoldedFacets", async () => {
    const facets = { organism: [{ value: "9606", count: 5, label: "Homo sapiens" }] }
    server.use(crossSearchByAstHandler({ response: minimalCrossSearchByAstResponse("human", facets) }))
    const out = await fetchSearchResults(null, lookupAst, PARAMS, BASE)
    expect(out.dsl).toBe("human")
    expect(out.facets).toEqual(facets)
  })

  test("perDbResponse_kindAndDsl", async () => {
    server.use(dbSearchByAstHandler({ response: minimalDbSearchByAstResponse("human", null) }))
    const out = await fetchSearchResults("biosample", lookupAst, PARAMS, BASE)
    expect(out.result.kind).toBe("perDb")
    expect(out.dsl).toBe("human")
  })

  test("crossSearch_serverError_rejects", async () => {
    server.use(http.post("*/db-portal/cross-search", () => new HttpResponse(null, { status: 500 })))
    await expect(fetchSearchResults(null, lookupAst, PARAMS, BASE)).rejects.toThrow()
  })

  test("perDbSearch_serverError_rejects", async () => {
    server.use(http.post("*/db-portal/search", () => new HttpResponse(null, { status: 500 })))
    await expect(fetchSearchResults("biosample", lookupAst, PARAMS, BASE)).rejects.toThrow()
  })
})

describe("fetchSearchResults: exact match (cross)", () => {
  const lightweightCross: CrossSearchResponse = {
    databases: [{
      db: "bioproject",
      count: 1,
      error: null,
      hits: [{ identifier: "PRJDB1", type: "bioproject", title: "Light title" }],
    }],
    facets: null,
  }
  const fullHit: DbSearchResponse = {
    total: 1,
    hits: [{ identifier: "PRJDB1", type: "bioproject", title: "Full title", projectType: ["genome"] }],
    hardLimitReached: false,
    page: 1,
    perPage: 20,
    hasNext: false,
    facets: null,
  }

  test("detectedLookup_probesAndLiftsToFullHit", async () => {
    const probes: URL[] = []
    server.use(
      crossSearchByAstHandler({ response: { ...lightweightCross, dsl: "PRJDB1" } }),
      dbSearchByAstHandler({ response: { ...fullHit, dsl: "PRJDB1" }, onRequest: (u) => probes.push(u) }),
    )
    const out = await fetchSearchResults(null, lookupAst, PARAMS, BASE)
    if (out.result.kind !== "cross") throw new Error("expected cross")
    expect(out.result.exactMatch?.hit.title).toBe("Full title")
    expect(probes).toHaveLength(1)
  })

  test("probeMissesIdentifier_fallsBackToLightweight", async () => {
    server.use(
      crossSearchByAstHandler({ response: { ...lightweightCross, dsl: "PRJDB1" } }),
      dbSearchByAstHandler({ response: minimalDbSearchByAstResponse("PRJDB1") }), // hits: []
    )
    const out = await fetchSearchResults(null, lookupAst, PARAMS, BASE)
    if (out.result.kind !== "cross") throw new Error("expected cross")
    expect(out.result.exactMatch?.hit.title).toBe("Light title")
  })

  test("probeFailure_fallsBackToLightweight", async () => {
    server.use(
      crossSearchByAstHandler({ response: { ...lightweightCross, dsl: "PRJDB1" } }),
      http.post("*/db-portal/search", () => new HttpResponse(null, { status: 500 })),
    )
    const out = await fetchSearchResults(null, lookupAst, PARAMS, BASE)
    if (out.result.kind !== "cross") throw new Error("expected cross")
    expect(out.result.exactMatch?.hit.title).toBe("Light title")
  })

  test("structuredQuery_noProbe_nullExactMatch", async () => {
    const probes: URL[] = []
    const structured: ParseNode = { op: "eq", field: "organism_id", value: "PRJDB1" }
    server.use(
      crossSearchByAstHandler({ response: { ...lightweightCross, dsl: "organism_id:PRJDB1" } }),
      dbSearchByAstHandler({ onRequest: (u) => probes.push(u) }),
    )
    const out = await fetchSearchResults(null, structured, PARAMS, BASE)
    if (out.result.kind !== "cross") throw new Error("expected cross")
    expect(out.result.exactMatch).toBeNull()
    expect(probes).toHaveLength(0)
  })
})
