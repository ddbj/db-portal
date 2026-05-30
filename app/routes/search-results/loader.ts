import type { LoaderFunctionArgs } from "react-router"

import {
  type DbSlug,
  type PerPageValue,
  readSearchParams,
  type SortKey,
  sortKeyToApiSort,
} from "~/features/search"
import {
  crossSearch,
  type CrossSearchResponse,
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
  ast: ParseNode | null
  errorKey: "parse" | "cross" | "db" | null
}

export const loader = async ({ request }: LoaderFunctionArgs): Promise<LoaderData> => {
  const url = new URL(request.url)
  const params = readSearchParams(url.searchParams)
  const envBaseUrl = process.env.DB_PORTAL_SEARCH_API_URL
  const options = envBaseUrl ? { baseUrl: envBaseUrl } : {}
  if (params.q === "") {
    return { ...params, cross: null, perDb: null, ast: null, errorKey: null }
  }
  let ast: ParseNode | null = null
  try {
    const parsed = await parseQuery({ q: params.q }, options)
    ast = parsed.ast
  } catch {
    return { ...params, cross: null, perDb: null, ast: null, errorKey: "parse" }
  }
  try {
    if (params.db === null) {
      const cross = await crossSearch({ q: params.q, topHits: 3 }, options)

      return { ...params, cross, perDb: null, ast, errorKey: null }
    }
    const apiSort = sortKeyToApiSort(params.sort)
    const perDb = await dbSearch(
      {
        q: params.q,
        db: params.db,
        page: params.page,
        perPage: params.perPage,
        ...(apiSort ? { sort: apiSort } : {}),
      },
      options,
    )

    return { ...params, cross: null, perDb, ast, errorKey: null }
  } catch {
    return {
      ...params,
      cross: null,
      perDb: null,
      ast,
      errorKey: params.db === null ? "cross" : "db",
    }
  }
}
