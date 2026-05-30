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

export type LoaderData = {
  q: string
  db: DbSlug | null
  page: number
  perPage: PerPageValue
  sort: SortKey
  cross: CrossSearchResponse | null
  perDb: DbSearchResponse | null
  facets: DbPortalFacets | null
  ast: ParseNode | null
  errorKey: "parse" | "cross" | "db" | null
}

const FACETS_SIZE = 100

const facetParam = (db: DbSlug | null): { facets?: string; facetsSize?: number } => {
  const facets = scopeFacetParam(db)

  return facets === "" ? {} : { facets, facetsSize: FACETS_SIZE }
}

export const loader = async ({ request }: LoaderFunctionArgs): Promise<LoaderData> => {
  const url = new URL(request.url)
  const params = readSearchParams(url.searchParams)
  const envBaseUrl = process.env.DB_PORTAL_SEARCH_API_URL
  const options = envBaseUrl ? { baseUrl: envBaseUrl } : {}
  if (params.q === "") {
    return { ...params, cross: null, perDb: null, facets: null, ast: null, errorKey: null }
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
    return { ...params, cross: null, perDb: null, facets: null, ast: null, errorKey: "parse" }
  }
  try {
    if (params.db === null) {
      const cross = await crossSearch(
        { q: params.q, topHits: 3, ...facetParam(null) },
        options,
      )

      return { ...params, cross, perDb: null, facets: cross.facets ?? null, ast, errorKey: null }
    }
    const apiSort = sortKeyToApiSort(params.sort)
    const perDb = await dbSearch(
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

    return { ...params, cross: null, perDb, facets: perDb.facets ?? null, ast, errorKey: null }
  } catch {
    return {
      ...params,
      cross: null,
      perDb: null,
      facets: null,
      ast,
      errorKey: params.db === null ? "cross" : "db",
    }
  }
}
