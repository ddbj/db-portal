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

export const SORT_KEYS = ["relevance", "date_desc", "date_asc"] as const

export type SortKey = typeof SORT_KEYS[number]

export const isSortKey = (value: string): value is SortKey =>
  (SORT_KEYS as readonly string[]).includes(value)
