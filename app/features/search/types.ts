export const DB_SLUGS = ["trad", "sra", "bioproject", "biosample", "jga", "gea", "metabobank", "taxonomy"] as const

export type DbSlug = typeof DB_SLUGS[number]

export const isDbSlug = (value: string): value is DbSlug =>
  (DB_SLUGS as readonly string[]).includes(value)

export const PER_PAGE_VALUES = [20, 50, 100] as const

export type PerPageValue = typeof PER_PAGE_VALUES[number]

export const isPerPageValue = (value: number): value is PerPageValue =>
  (PER_PAGE_VALUES as readonly number[]).includes(value)

export const SORT_KEYS = ["relevance", "date_desc", "date_asc"] as const

export type SortKey = typeof SORT_KEYS[number]

export const isSortKey = (value: string): value is SortKey =>
  (SORT_KEYS as readonly string[]).includes(value)

export type ApiSortValue = "datePublished:asc" | "datePublished:desc"

export const sortKeyToApiSort = (key: SortKey): ApiSortValue | undefined => {
  if (key === "date_asc") return "datePublished:asc"
  if (key === "date_desc") return "datePublished:desc"

  return undefined
}

export type SyncStatus = "idle" | "syncing" | "synced" | "failed"

export const ADVANCED_FIELDS = [
  "organism",
  "identifier",
  "title",
  "description",
  "date_published",
  "date_modified",
  "date_created",
] as const

export type AdvancedField = typeof ADVANCED_FIELDS[number]

export const isAdvancedField = (value: string): value is AdvancedField =>
  (ADVANCED_FIELDS as readonly string[]).includes(value)

export const DATE_FIELDS: readonly AdvancedField[] = [
  "date_published",
  "date_modified",
  "date_created",
]

export const isDateField = (value: AdvancedField): boolean =>
  DATE_FIELDS.includes(value)

export const ADVANCED_OPS = ["eq", "contains", "wildcard", "between"] as const

export type AdvancedOp = typeof ADVANCED_OPS[number]

export type AdvancedCombinator = "AND" | "OR" | "NOT"
