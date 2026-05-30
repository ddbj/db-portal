import { useQuery } from "@tanstack/react-query"

import { crossSearch, type DbPortalFacets, dbSearch } from "~/lib/api"
import type { DbSlug } from "~/lib/search-scope"

import { scopeFacetParam } from "../sidebar/facet-config"

// Bucket cap per facet, matching the results-page loader so the builder offers the
// same candidate set the sidebar would.
const FACETS_SIZE = 100

const STALE_MS = 5 * 60 * 1000

// Fetch the active scope's facet aggregation (over the whole scope, i.e. an
// unfiltered match_all) so the builder can suggest candidate values for facetable
// fields. The request mirrors the results loader's `facets` set per scope, so it
// is always API-valid; cross uses the fan-out endpoint, a single DB the paginated
// one. Returns null when the scope has no facets or the request fails (the value
// inputs then fall back to plain free text).
const fetchScopeFacets = async (
  db: DbSlug | null,
  baseUrl?: string,
): Promise<DbPortalFacets | null> => {
  const facets = scopeFacetParam(db)
  if (facets === "") return null
  const options = baseUrl === undefined ? {} : { baseUrl }
  if (db === null) {
    const cross = await crossSearch({ topHits: 0, facets, facetsSize: FACETS_SIZE }, options)

    return cross.facets ?? null
  }
  // The builder only needs the facet aggregation, not the hits; perPage is the
  // smallest allowed page size since a count-only mode is not exposed per-DB.
  const perDb = await dbSearch({ db, perPage: 20, facets, facetsSize: FACETS_SIZE }, options)

  return perDb.facets ?? null
}

export const useScopeFacets = (
  db: DbSlug | null,
  baseUrl?: string,
): DbPortalFacets | null => {
  const query = useQuery({
    queryKey: ["builder-facets", db],
    queryFn: () => fetchScopeFacets(db, baseUrl),
    enabled: scopeFacetParam(db) !== "",
    staleTime: STALE_MS,
    refetchOnWindowFocus: false,
  })

  return query.data ?? null
}
