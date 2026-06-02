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

// The heavy search resolves through this union so the route's single <Await>
// has one render path: a successful cross/per-DB payload, a folded error, or
// an empty query that renders no grid.
export type SearchResult =
  | { kind: "cross"; cross: CrossSearchResponse; facets: DbPortalFacets | null }
  | { kind: "perDb"; perDb: DbSearchResponse; facets: DbPortalFacets | null }
  | { kind: "error"; errorKey: "cross" | "db" }
  | { kind: "empty" }

export type LoaderData = {
  q: string
  db: DbSlug | null
  page: number
  perPage: PerPageValue
  sort: SortKey
  ast: ParseNode | null
  parseError: boolean
  results: Promise<SearchResult>
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
  if (params.q === "") {
    return { ...params, ast: null, parseError: false, results: Promise.resolve({ kind: "empty" }) }
  }
  let ast: ParseNode | null = null
  try {
    // Parse in the same scope as the search: single-DB mode admits Tier 3
    // fields (the per-DB facets emit them), which cross mode would reject.
    const parsed = await parseQuery(
      { q: params.q, ...(params.db ? { db: params.db } : {}) },
      options,
    )
    ast = parsed.ast
  } catch {
    return { ...params, ast: null, parseError: true, results: Promise.resolve({ kind: "empty" }) }
  }
  // Defer the search so the route paints its shell and skeleton at once, then
  // fills the grid when this resolves. Parse stays awaited above: its ast drives
  // the keyword box and facet sidebar, which render before the results arrive.
  let results: Promise<SearchResult>
  if (params.db === null) {
    results = crossSearch({ q: params.q, topHits: 3, ...facetParam(null) }, options)
      .then((cross): SearchResult => ({ kind: "cross", cross, facets: cross.facets ?? null }))
      .catch((): SearchResult => ({ kind: "error", errorKey: "cross" }))
  } else {
    const apiSort = sortKeyToApiSort(params.sort)
    results = dbSearch(
      {
        q: params.q,
        db: params.db,
        page: params.page,
        perPage: params.perPage,
        ...(apiSort ? { sort: apiSort } : {}),
        ...facetParam(params.db),
      },
      options,
    )
      .then((perDb): SearchResult => ({ kind: "perDb", perDb, facets: perDb.facets ?? null }))
      .catch((): SearchResult => ({ kind: "error", errorKey: "db" }))
  }

  return { ...params, ast, parseError: false, results }
}
