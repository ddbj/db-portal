import type { Lang } from "~/lib/i18n"

import {
  type DbSlug,
  isDbSlug,
  isPerPageValue,
  isSortKey,
  type PerPageValue,
  type SortKey,
} from "../types"

export const DEFAULT_PAGE = 1
export const DEFAULT_PER_PAGE: PerPageValue = 20
export const DEFAULT_SORT: SortKey = "relevance"

export type SearchUrlState = {
  q: string
  db: DbSlug | null
  page: number
  perPage: PerPageValue
  sort: SortKey
}

export const readSearchParams = (params: URLSearchParams): SearchUrlState => {
  const q = params.get("q") ?? ""
  const rawDb = params.get("db")
  const db = rawDb !== null && isDbSlug(rawDb) ? rawDb : null
  const rawPage = Number.parseInt(params.get("page") ?? "", 10)
  const page = Number.isInteger(rawPage) && rawPage >= 1 ? rawPage : DEFAULT_PAGE
  const rawPerPage = Number.parseInt(params.get("perPage") ?? "", 10)
  const perPage = isPerPageValue(rawPerPage) ? rawPerPage : DEFAULT_PER_PAGE
  const rawSort = params.get("sort")
  const sort = rawSort !== null && isSortKey(rawSort) ? rawSort : DEFAULT_SORT

  return { q, db, page, perPage, sort }
}

export const writeSearchParams = (state: Partial<SearchUrlState>): URLSearchParams => {
  const params = new URLSearchParams()
  if (state.q !== undefined && state.q !== "") params.set("q", state.q)
  if (state.db) params.set("db", state.db)
  if (state.page !== undefined && state.page !== DEFAULT_PAGE) {
    params.set("page", String(state.page))
  }
  if (state.perPage !== undefined && state.perPage !== DEFAULT_PER_PAGE) {
    params.set("perPage", String(state.perPage))
  }
  if (state.sort !== undefined && state.sort !== DEFAULT_SORT) {
    params.set("sort", state.sort)
  }

  return params
}

export const langPrefix = (lang: Lang): "" | "/en" => (lang === "en" ? "/en" : "")

export const buildSearchHref = (lang: Lang): string => `${langPrefix(lang)}/search`

export const buildResultsHref = (state: Partial<SearchUrlState>, lang: Lang): string => {
  const params = writeSearchParams(state)
  const search = params.toString()

  return `${langPrefix(lang)}/search/results${search ? `?${search}` : ""}`
}
