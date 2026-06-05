import { useQuery } from "@tanstack/react-query"

import type { DbPortalFacets, ParseNode } from "~/lib/api"

import type { DbSlug } from "../types"
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
  // No data for the active key yet: the route paints the skeleton. A key with
  // cached data (e.g. re-toggling a facet) is not pending, so it renders at once.
  isPending: boolean
  isError: boolean
  refetch: () => void
}

// Drive the results from the client-held AST: the query key is the search intent
// (scope + AST + paging), so a facet / builder edit refetches at once with a
// skeleton, and the URL is synced from the echoed `dsl` separately. One request
// yields hits, q-aware facets, and the `dsl` (no serialize / parse round trips).
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
  })

  return {
    result: query.data?.result ?? null,
    dsl: query.data?.dsl ?? null,
    facets: query.data?.facets ?? placeholderFacets,
    isPending: enabled && query.isPending,
    isError: query.isError,
    refetch: () => void query.refetch(),
  }
}
