import type { LoaderFunctionArgs } from "react-router"

import {
  type DbSlug,
  type PerPageValue,
  readSearchParams,
  scopeFacetParam,
  type SortKey,
} from "~/features/search"
import {
  crossSearch,
  type DbPortalFacets,
  dbSearch,
  type ParseNode,
  parseQuery,
} from "~/lib/api"

import { peekMatchAllFacets } from "./facet-cache.server"

// The route restores its GUI surfaces from `ast` (parsed from `?q=`) and runs the
// search itself client-side from that AST; the loader fetches no hits. Facet buckets
// ride a separate `facets` value (an instant cached placeholder), replaced by the
// q-aware aggregation that the search response carries (docs/search.md § Sidebar facet).
export type LoaderData = {
  q: string
  db: DbSlug | null
  page: number
  perPage: PerPageValue
  sort: SortKey
  ast: ParseNode | null
  parseError: boolean
  // Instant placeholder buckets: the scope's cached match_all aggregation (warm →
  // value, cold → null while a background fill warms the cache). The sidebar shows
  // these until the q-aware aggregation rides in on the search response.
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
      // running the search.
      return { ...params, ast: null, parseError: true, facets: null }
    }
  }

  return { ...params, ast, parseError: false, facets: matchAllPlaceholder(params.db, options) }
}
