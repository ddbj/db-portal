import type { LoaderFunctionArgs } from "react-router"

import {
  type DbSlug,
  findExactMatch,
  type PerPageValue,
  readSearchParams,
  type ResolvedExactMatch,
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

import { peekMatchAllFacets } from "./facet-cache.server"

// Hits resolve through this union so the route's <Await> has one render path: a
// cross/per-DB payload, or a folded error. Facet buckets ride a separate `facets`
// value (an instant cached placeholder), refined client-side by the sidebar
// (docs/search.md § 検索結果 UI / § Sidebar facet). The cross arm also carries the
// resolved exact-match entry (full hit) so the route renders it without re-deriving.
export type SearchResult =
  | { kind: "cross"; cross: CrossSearchResponse; exactMatch: ResolvedExactMatch | null }
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
  // Instant placeholder buckets: the scope's cached match_all aggregation (warm →
  // value, cold → null while a background fill warms the cache). The sidebar refines
  // these with the q-aware aggregation client-side (docs/search.md § Sidebar facet).
  facets: DbPortalFacets | null
}

const FACETS_SIZE = 100

const facetParam = (
  db: DbSlug | null,
): { facets?: string; facetsSize?: number; facetSelfExclude?: boolean } => {
  const facets = scopeFacetParam(db)
  // Drop each facet's own q filter from its aggregation population so a multi-select
  // facet keeps offering its other values (docs/search.md § 候補値・件数の出所).
  return facets === "" ? {} : { facets, facetsSize: FACETS_SIZE, facetSelfExclude: true }
}

// The scope's cached scope-wide (match_all) facets as an instant SSR placeholder.
// Never blocks the stream on the heavy aggregation: a cold miss returns null and
// warms the cache in the background for the next request (docs/search.md § Sidebar
// facet). The client-side sidebar hook supplies the accurate q-aware counts.
const matchAllPlaceholder = (
  db: DbSlug | null,
  options: { baseUrl?: string },
): DbPortalFacets | null => {
  if (scopeFacetParam(db) === "") return null
  const scope = db === null ? "cross" : `db:${db}`
  const fetcher = db === null
    ? () => crossSearch({ topHits: 0, ...facetParam(null) }, options).then((res) => res.facets ?? null)
    : () => dbSearch({ db, ...facetParam(db) }, options).then((res) => res.facets ?? null)

  return peekMatchAllFacets(scope, fetcher)
}

// Page size of the follow-up per-DB probe (smallest the API allows): the named
// entry ranked in the cross-search top-3 for its arm, so it leads the same q on
// the per-DB endpoint and sits on the first page.
const EXACT_MATCH_PROBE_PER_PAGE = 20

// Resolve the detected exact match to a full per-DB hit. The cross-search reply
// only carries lightweight hits, so re-run the committed query against the matched
// DB (same q that already unlocked any suppressed entry in cross-search) and pick
// the hit with the matched identifier, giving the card the full signature chips /
// lineage of a per-DB row. Any miss / failure folds back to the lightweight hit so
// the card always renders (docs/search.md § 完全一致カード).
const resolveExactMatch = async (
  ast: ParseNode | null,
  q: string,
  databases: CrossSearchResponse["databases"],
  options: { baseUrl?: string },
): Promise<ResolvedExactMatch | null> => {
  const detected = findExactMatch(ast, databases)
  if (!detected) return null
  const fallback: ResolvedExactMatch = {
    db: detected.db,
    hit: detected.hit as unknown as DbSearchResponse["hits"][number],
  }
  try {
    const res = await dbSearch({ db: detected.db, q, perPage: EXACT_MATCH_PROBE_PER_PAGE }, options)
    const wanted = detected.hit.identifier.toLowerCase()
    const full = res.hits.find((h) => h.identifier.toLowerCase() === wanted)

    return full ? { db: detected.db, hit: full } : fallback
  } catch {
    return fallback
  }
}

export const loader = async ({ request }: LoaderFunctionArgs): Promise<LoaderData> => {
  const url = new URL(request.url)
  const params = readSearchParams(url.searchParams)
  const envBaseUrl = process.env.DB_PORTAL_SEARCH_API_URL
  const options = envBaseUrl ? { baseUrl: envBaseUrl } : {}
  // An empty q means "no filter": parse is skipped and the search runs as match_all
  // (q omitted), so cross / per-DB list every record (docs/search.md § URL 設計). The
  // facet sidebar still renders, so the user can narrow down from the full set.
  let ast: ParseNode | null = null
  if (params.q !== "") {
    try {
      // Parse in the same scope as the search: single-DB mode admits Tier 3 fields
      // (the per-DB facets emit them), which cross mode would reject.
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
        facets: null,
      }
    }
  }
  // Defer the hits so the route paints its shell and skeleton at once, then fills the
  // grid when this resolves. Facets are not fetched here: the sidebar pulls the
  // accurate q-aware aggregation client-side and shows the cached match_all
  // placeholder below until it lands.
  const qPart = params.q === "" ? {} : { q: params.q }
  let results: Promise<SearchResult>
  if (params.db === null) {
    results = crossSearch({ ...qPart, topHits: 3 }, options)
      .then(async (cross): Promise<SearchResult> => ({
        kind: "cross",
        cross,
        exactMatch: await resolveExactMatch(ast, params.q, cross.databases, options),
      }))
      .catch((): SearchResult => ({ kind: "error", errorKey: "cross" }))
  } else {
    const db = params.db
    const apiSort = sortKeyToApiSort(params.sort)
    results = dbSearch(
      {
        ...qPart,
        db,
        page: params.page,
        perPage: params.perPage,
        ...(apiSort ? { sort: apiSort } : {}),
      },
      options,
    )
      .then((perDb): SearchResult => ({ kind: "perDb", perDb }))
      .catch((): SearchResult => ({ kind: "error", errorKey: "db" }))
  }

  return { ...params, ast, parseError: false, results, facets: matchAllPlaceholder(params.db, options) }
}
