export const DB_SLUGS = [
  "trad",
  "sra",
  "bioproject",
  "biosample",
  "jga",
  "gea",
  "metabobank",
  "taxonomy",
] as const

export type DbSlug = typeof DB_SLUGS[number]

export const isDbSlug = (value: string): value is DbSlug =>
  (DB_SLUGS as readonly string[]).includes(value)

export const SCOPE_KEYS = ["all", ...DB_SLUGS] as const

export type ScopeKey = typeof SCOPE_KEYS[number]

export const scopeKeyToDbSlug = (key: ScopeKey): DbSlug | null =>
  key === "all" ? null : key

export const dbSlugToScopeKey = (db: DbSlug | null): ScopeKey =>
  db === null ? "all" : db

export const PER_PAGE_VALUES = [20, 50, 100] as const

export type PerPageValue = typeof PER_PAGE_VALUES[number]

export const isPerPageValue = (value: number): value is PerPageValue =>
  (PER_PAGE_VALUES as readonly number[]).includes(value)

// Deep paging limit: the search API rejects page * perPage > 10000 with a 400
// (openapi-types.ts の page フィールド JSDoc)。UI はこれを超えるページを描画しない。
export const SEARCH_HARD_LIMIT = 10000

// The deepest page reachable for a perPage without tripping the deep paging limit.
export const maxReachablePage = (perPage: PerPageValue): number =>
  Math.floor(SEARCH_HARD_LIMIT / perPage)

// Page count for `total` hits, capped at the deep paging limit so no offered page
// would have the API reject page * perPage > 10000.
export const reachablePageCount = (total: number, perPage: PerPageValue): number =>
  total <= 0 ? 0 : Math.min(Math.ceil(total / perPage), maxReachablePage(perPage))

export const SORT_KEYS = ["relevance", "date_desc", "date_asc"] as const

export type SortKey = typeof SORT_KEYS[number]

export const isSortKey = (value: string): value is SortKey =>
  (SORT_KEYS as readonly string[]).includes(value)
