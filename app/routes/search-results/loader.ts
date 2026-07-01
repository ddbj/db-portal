import type { LoaderFunctionArgs, ShouldRevalidateFunction } from "react-router"
import { redirect } from "react-router"

import {
  type DbSlug,
  facetAggParam,
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
import { isAPIError } from "~/lib/api/errors"
import { buildResultsHref } from "~/lib/search-url"

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
  // parseError: search API が 400 を返した = query が構文エラー。 route は
  // parseFailure Callout を出す (retry では直らないので edit-in-builder を促す)。
  parseError: boolean
  // systemError: 400 以外の失敗 (5xx / network / timeout)。 上流の一時的な障害
  // なので retry Callout を出す。
  systemError: boolean
  // Instant placeholder buckets: the scope's cached match_all aggregation (warm →
  // value, cold → null while a background fill warms the cache). The sidebar shows
  // these until the q-aware aggregation rides in on the search response.
  facets: DbPortalFacets | null
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
    ? () => crossSearch({ topHits: 0, ...facetAggParam(null) }, options).then((res) => res.facets ?? null)
    : () => dbSearch({ db, ...facetAggParam(db) }, options).then((res) => res.facets ?? null)

  return peekMatchAllFacets(scope, fetcher)
}

export const loader = async ({ request }: LoaderFunctionArgs): Promise<LoaderData> => {
  const url = new URL(request.url)
  const params = readSearchParams(url.searchParams)
  // Canonical URL とズレていれば 302 で正規化する。
  // 対象: 手入力の `?page=999999` (deep-paging 上限で clamp)、 default 値の
  // 明示 (`?page=1`, `?perPage=20`, `?sort=relevance`)、 invalid 値の rollback。
  // shared link が canonical form に揃うので facet cache key もブレない。
  const canonicalSearch = buildResultsHref(params).split("?")[1] ?? ""
  const rawSearch = url.searchParams.toString()
  if (rawSearch !== canonicalSearch) {
    throw redirect(`${url.pathname}${canonicalSearch ? `?${canonicalSearch}` : ""}${url.hash}`)
  }
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
    } catch (e) {
      // 400 だけを parseError として区別する。 5xx / network / timeout は
      // 「query は正しいが上流が落ちてる」 状況なので systemError にして retry
      // Callout を出す (parseFailure Callout は edit-in-builder を促すので違う)。
      if (isAPIError(e) && e.status === 400) {
        return {
          ...params,
          ast: null,
          parseError: true,
          systemError: false,
          facets: null,
        }
      }

      return {
        ...params,
        ast: null,
        parseError: false,
        systemError: true,
        facets: null,
      }
    }
  }

  return {
    ...params,
    ast,
    parseError: false,
    systemError: false,
    facets: matchAllPlaceholder(params.db, options),
  }
}

// URL の search 部分が変わらない navigation (state 復元 / hash / pathname のみ変化)
// では parseQuery を再実行しない。 facet click は search を書き換えるので通常通り
// revalidate される。
export const shouldRevalidate: ShouldRevalidateFunction = ({
  currentUrl,
  nextUrl,
  defaultShouldRevalidate,
}) => {
  if (currentUrl.search === nextUrl.search) return false

  return defaultShouldRevalidate
}
