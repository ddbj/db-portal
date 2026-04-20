import { DB_ORDER, type DbId } from "@/types/db"

export const ALL_DB_VALUE = "all" as const

export type DbSelectValue = typeof ALL_DB_VALUE | DbId

export const SORT_VALUES = ["relevance", "date_desc", "date_asc"] as const
export type SortValue = typeof SORT_VALUES[number]
export const DEFAULT_SORT: SortValue = "relevance"

export const PER_PAGE_VALUES = [20, 50, 100] as const
export type PerPageValue = typeof PER_PAGE_VALUES[number]
export const DEFAULT_PER_PAGE: PerPageValue = 20

export const DEFAULT_PAGE = 1

const VALID_DB_SET: ReadonlySet<string> = new Set<string>(DB_ORDER)
const VALID_SORT_SET: ReadonlySet<string> = new Set<string>(SORT_VALUES)
const VALID_PER_PAGE_SET: ReadonlySet<number> = new Set<number>(PER_PAGE_VALUES)

export interface BuildSearchUrlParams {
  q: string
  db: DbSelectValue
}

export const buildSearchUrl = ({ q, db }: BuildSearchUrlParams): string => {
  const params = new URLSearchParams()
  const trimmedQ = q.trim()
  if (trimmedQ !== "") params.set("q", trimmedQ)
  if (db !== ALL_DB_VALUE) params.set("db", db)
  const query = params.toString()

  return query === "" ? "/search" : `/search?${query}`
}

export interface SearchParams {
  q: string | null
  adv: string | null
  db: DbSelectValue
  page: number
  perPage: PerPageValue
  sort: SortValue
  cursor: string | null
}

export type SearchParamsSoftError = "both_q_and_adv"

export interface ParseSearchResult {
  params: SearchParams
  canonicalUrl: string | null
  softErrors: readonly SearchParamsSoftError[]
  shouldRedirectToHome: boolean
}

const parseQueryString = (raw: string | null): string | null => {
  if (raw === null) return null
  const trimmed = raw.trim()

  return trimmed === "" ? null : trimmed
}

const parseDb = (raw: string | null): DbSelectValue => {
  if (raw === null) return ALL_DB_VALUE
  if (raw === ALL_DB_VALUE) return ALL_DB_VALUE
  if (VALID_DB_SET.has(raw)) return raw as DbId

  return ALL_DB_VALUE
}

const parsePage = (raw: string | null): number => {
  if (raw === null || raw === "") return DEFAULT_PAGE
  if (!/^\d+$/.test(raw)) return DEFAULT_PAGE
  const n = Number.parseInt(raw, 10)
  if (!Number.isInteger(n) || n < 1) return DEFAULT_PAGE

  return n
}

const parsePerPage = (raw: string | null): PerPageValue => {
  if (raw === null || raw === "") return DEFAULT_PER_PAGE
  const n = Number.parseInt(raw, 10)
  if (VALID_PER_PAGE_SET.has(n)) return n as PerPageValue

  return DEFAULT_PER_PAGE
}

const parseSort = (raw: string | null): SortValue => {
  if (raw === null) return DEFAULT_SORT
  if (VALID_SORT_SET.has(raw)) return raw as SortValue

  return DEFAULT_SORT
}

const parseCursor = (raw: string | null): string | null => {
  if (raw === null) return null

  return raw === "" ? null : raw
}

export interface BuildSearchUrlFullParams {
  q?: string | null
  adv?: string | null
  db?: DbSelectValue
  page?: number
  perPage?: PerPageValue
  sort?: SortValue
  cursor?: string | null
}

export const buildSearchUrlFull = (p: BuildSearchUrlFullParams): string => {
  const params = new URLSearchParams()
  const q = p.q?.trim()
  if (q !== undefined && q !== null && q !== "") params.set("q", q)
  const db = p.db ?? ALL_DB_VALUE
  if (db !== ALL_DB_VALUE) params.set("db", db)
  const page = p.page ?? DEFAULT_PAGE
  if (page !== DEFAULT_PAGE) params.set("page", String(page))
  const perPage = p.perPage ?? DEFAULT_PER_PAGE
  if (perPage !== DEFAULT_PER_PAGE) params.set("perPage", String(perPage))
  const sort = p.sort ?? DEFAULT_SORT
  if (sort !== DEFAULT_SORT) params.set("sort", sort)
  if (p.cursor !== undefined && p.cursor !== null && p.cursor !== "") {
    params.set("cursor", p.cursor)
  }
  const adv = p.adv?.trim()
  if (adv !== undefined && adv !== null && adv !== "") params.set("adv", adv)
  const query = params.toString()

  return query === "" ? "/search" : `/search?${query}`
}

export const parseSearchUrl = (searchParams: URLSearchParams): ParseSearchResult => {
  const q = parseQueryString(searchParams.get("q"))
  const adv = parseQueryString(searchParams.get("adv"))
  const db = parseDb(searchParams.get("db"))
  const page = parsePage(searchParams.get("page"))
  const perPage = parsePerPage(searchParams.get("perPage"))
  const sort = parseSort(searchParams.get("sort"))
  const cursor = parseCursor(searchParams.get("cursor"))

  const params: SearchParams = { q, adv, db, page, perPage, sort, cursor }

  const softErrors: SearchParamsSoftError[] = []
  if (q !== null && adv !== null) softErrors.push("both_q_and_adv")

  const shouldRedirectToHome = q === null && adv === null

  const canonical = buildSearchUrlFull({ q, adv, db, page, perPage, sort, cursor })
  const originalQueryString = searchParams.toString()
  const canonicalQueryString = canonical.startsWith("/search?")
    ? canonical.slice("/search?".length)
    : ""

  const canonicalUrl = originalQueryString === canonicalQueryString ? null : canonical

  return { params, canonicalUrl, softErrors, shouldRedirectToHome }
}
