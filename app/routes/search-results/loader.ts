import type { LoaderFunctionArgs } from "react-router"

import {
  type DbSlug,
  type PerPageValue,
  readSearchParams,
  scopeFacetParam,
  type SortKey,
  sortKeyToApiSort,
} from "~/features/search"
import {
  crossSearch,
  type CrossSearchResponse,
  type DbPortalFacets,
  dbSearch,
  type DbSearchResponse,
  type ParseNode,
  parseQuery,
} from "~/lib/api"

import { getCachedMatchAllFacets } from "./facet-cache.server"

// Hits resolve through this union so the route's <Await> has one render path: a
// cross/per-DB payload, or a folded error. Facet aggregation rides a separate
// `facets` deferred so a heavy match_all aggregation never blocks the grid
// (docs/search.md § 検索結果 UI).
export type SearchResult =
  | { kind: "cross"; cross: CrossSearchResponse }
  | { kind: "perDb"; perDb: DbSearchResponse }
  | { kind: "error"; errorKey: "cross" | "db" }

export type LoaderData = {
  q: string
  db: DbSlug | null
  page: number
  perPage: PerPageValue
  sort: SortKey
  ast: ParseNode | null
  parseError: boolean
  results: Promise<SearchResult>
  facets: Promise<DbPortalFacets | null>
}

const FACETS_SIZE = 100

const facetParam = (
  db: DbSlug | null,
): { facets?: string; facetsSize?: number; facetSelfExclude?: boolean } => {
  const facets = scopeFacetParam(db)
  // Drop each facet's own q filter from its aggregation population so a
  // multi-select facet keeps offering its other values; hits stay filtered by
  // the full q (docs/search.md § 候補値・件数の出所).
  return facets === "" ? {} : { facets, facetsSize: FACETS_SIZE, facetSelfExclude: true }
}

export const loader = async ({ request }: LoaderFunctionArgs): Promise<LoaderData> => {
  const url = new URL(request.url)
  const params = readSearchParams(url.searchParams)
  const envBaseUrl = process.env.DB_PORTAL_SEARCH_API_URL
  const options = envBaseUrl ? { baseUrl: envBaseUrl } : {}
  // An empty q means "no filter": parse is skipped and the search runs as
  // match_all (q omitted), so cross / per-DB list every record (docs/search.md
  // § URL 設計). The facet sidebar still renders, so the user can narrow down
  // from the full set.
  let ast: ParseNode | null = null
  if (params.q !== "") {
    try {
      // Parse in the same scope as the search: single-DB mode admits Tier 3
      // fields (the per-DB facets emit them), which cross mode would reject.
      const parsed = await parseQuery(
        { q: params.q, ...(params.db ? { db: params.db } : {}) },
        options,
      )
      ast = parsed.ast
    } catch {
      // Malformed q: the route reads parseError and paints a callout instead of
      // awaiting the search, so this result only stands in to satisfy the type.
      return {
        ...params,
        ast: null,
        parseError: true,
        results: Promise.resolve({ kind: "error", errorKey: params.db ? "db" : "cross" }),
        facets: Promise.resolve(null),
      }
    }
  }
  // Defer the search so the route paints its shell and skeleton at once, then
  // fills the grid when this resolves. Parse stays awaited above: its ast drives
  // the keyword box and facet sidebar, which render before the results arrive.
  let results: Promise<SearchResult>
  let facets: Promise<DbPortalFacets | null>
  if (params.db === null) {
    if (params.q === "") {
      // match_all cross: counts + top hits stay light without facets, and the
      // heavy union-wide facet aggregation is cached across requests.
      results = crossSearch({ topHits: 3 }, options)
        .then((cross): SearchResult => ({ kind: "cross", cross }))
        .catch((): SearchResult => ({ kind: "error", errorKey: "cross" }))
      facets = getCachedMatchAllFacets("cross", () =>
        crossSearch({ topHits: 0, ...facetParam(null) }, options).then((res) => res.facets ?? null),
      ).catch(() => null)
    } else {
      // A real q keeps the aggregation cheap, so hits and facets share one request.
      const cross = crossSearch({ q: params.q, topHits: 3, ...facetParam(null) }, options)
      results = cross
        .then((res): SearchResult => ({ kind: "cross", cross: res }))
        .catch((): SearchResult => ({ kind: "error", errorKey: "cross" }))
      facets = cross.then((res) => res.facets ?? null).catch(() => null)
    }
  } else {
    const db = params.db
    const apiSort = sortKeyToApiSort(params.sort)
    if (params.q === "") {
      // match_all over one DB: aggregating facets over every record is slow, so
      // fetch hits without facets and resolve the sidebar from a cached
      // aggregation (instant on a hit, one slow miss otherwise).
      results = dbSearch(
        { db, page: params.page, perPage: params.perPage, ...(apiSort ? { sort: apiSort } : {}) },
        options,
      )
        .then((perDb): SearchResult => ({ kind: "perDb", perDb }))
        .catch((): SearchResult => ({ kind: "error", errorKey: "db" }))
      facets = getCachedMatchAllFacets(`db:${db}`, () =>
        dbSearch({ db, ...facetParam(db) }, options).then((res) => res.facets ?? null),
      ).catch(() => null)
    } else {
      // A real q narrows the aggregation population, so hits and facets stay
      // cheap enough to share one request.
      const perDb = dbSearch(
        {
          q: params.q,
          db,
          page: params.page,
          perPage: params.perPage,
          ...(apiSort ? { sort: apiSort } : {}),
          ...facetParam(db),
        },
        options,
      )
      results = perDb
        .then((res): SearchResult => ({ kind: "perDb", perDb: res }))
        .catch((): SearchResult => ({ kind: "error", errorKey: "db" }))
      facets = perDb.then((res) => res.facets ?? null).catch(() => null)
    }
  }

  return { ...params, ast, parseError: false, results, facets }
}
