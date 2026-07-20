import { keepPreviousData, useQuery } from "@tanstack/react-query"

import type { DbPortalFacets, ParseNode } from "~/lib/api"
import type { DbSlug } from "~/lib/search-scope"

import { fetchSearchResults, type SearchParams, type SearchResult } from "./fetch-results"

export type SearchResultsQuery = {
  // The rendered hits (cross / per-DB), or null while pending / on error.
  result: SearchResult | null
  // The `dsl` echo of the posted AST, projected into `?q=` once it lands (null
  // while pending / on error, so a failed search leaves the shared URL untouched).
  dsl: string | null
  // q-aware facets from the same response, falling back to the cached match_all
  // placeholder until the first response lands.
  facets: DbPortalFacets | null
  // True only until the very first response for this hook instance lands. A
  // subsequent edit keeps the prior data around (see keepPreviousData below), so
  // this stays false and the route does not fall back to the skeleton.
  isPending: boolean
  // Any fetch is currently in flight (initial or a keyed refetch). The route
  // uses this to render a subtle "updating" indicator on the results column
  // without unmounting the sidebar / input surfaces.
  isFetching: boolean
  isError: boolean
  refetch: () => void
}

// Drive the results from the client-held AST: the query key is the search intent
// (scope + AST + paging), so an edit refetches at once and the URL is synced from
// the echoed `dsl` separately. One request yields hits, q-aware facets, and the
// `dsl` (no serialize / parse round trips).
//
// keepPreviousData keeps the last resolved response mounted while a new key
// fetches, so the sidebar's controlled inputs never unmount mid-typing (which
// would drop caret focus).
export const useSearchResults = (
  db: DbSlug | null,
  ast: ParseNode,
  params: SearchParams,
  placeholderFacets: DbPortalFacets | null,
  enabled: boolean,
  baseUrl?: string,
): SearchResultsQuery => {
  const query = useQuery({
    queryKey: ["search-results", db, ast, params.page, params.perPage, params.sort],
    queryFn: () => fetchSearchResults(db, ast, params, baseUrl),
    enabled,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  })

  return {
    result: query.data?.result ?? null,
    dsl: query.data?.dsl ?? null,
    facets: query.data?.facets ?? placeholderFacets,
    isPending: enabled && query.isPending,
    isFetching: enabled && query.isFetching,
    isError: query.isError,
    refetch: () => void query.refetch(),
  }
}
