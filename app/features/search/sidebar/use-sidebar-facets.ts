import { useQuery } from "@tanstack/react-query"

import { crossSearch, type DbPortalFacets, dbSearch } from "~/lib/api"
import type { DbSlug } from "~/lib/search-scope"

import { scopeFacetParam } from "./facet-config"

// Bucket cap per facet, matching the results-page loader.
const FACETS_SIZE = 100

const STALE_MS = 5 * 60 * 1000

// Fetch the sidebar's accurate facet aggregation for the committed query: q-aware
// with self-exclusion when a query is set, scope-wide match_all otherwise. The
// request mirrors the loader's per-scope facet set, so it is always API-valid.
// Fetching client-side (not via the SSR deferred) keeps a heavy match_all from
// being killed by the SSR abort budget; the cached match_all placeholder shows
// meanwhile and is replaced by these counts when they resolve.
const fetchSidebarFacets = async (
  db: DbSlug | null,
  q: string,
  baseUrl?: string,
): Promise<DbPortalFacets | null> => {
  const facets = scopeFacetParam(db)
  if (facets === "") return null
  const options = baseUrl === undefined ? {} : { baseUrl }
  const agg = { facets, facetsSize: FACETS_SIZE, facetSelfExclude: true } as const
  const qPart = q === "" ? {} : { q }
  if (db === null) {
    const cross = await crossSearch({ ...qPart, topHits: 0, ...agg }, options)

    return cross.facets ?? null
  }
  const perDb = await dbSearch({ ...qPart, db, perPage: 20, ...agg }, options)

  return perDb.facets ?? null
}

export type SidebarFacets = {
  // Buckets to render: the cached match_all placeholder until the accurate query
  // resolves, then the q-aware counts. null only on a cold miss before either lands.
  facets: DbPortalFacets | null
  // True only while fetching with no buckets to show yet (cold first load), so the
  // sidebar can hold the rows with a skeleton instead of dropping them.
  loading: boolean
}

export const useSidebarFacets = (
  db: DbSlug | null,
  q: string,
  placeholder: DbPortalFacets | null,
  baseUrl?: string,
): SidebarFacets => {
  const query = useQuery({
    queryKey: ["sidebar-facets", db, q],
    queryFn: () => fetchSidebarFacets(db, q, baseUrl),
    enabled: scopeFacetParam(db) !== "",
    // A warm placeholder makes the query "success" immediately (no loading flash);
    // a cold (null) placeholder is omitted, leaving the query pending so `loading`
    // can hold the rows until the aggregation lands.
    ...(placeholder !== null ? { placeholderData: placeholder } : {}),
    staleTime: STALE_MS,
    refetchOnWindowFocus: false,
  })

  return { facets: query.data ?? null, loading: query.isLoading }
}
