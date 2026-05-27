import {
  DB_SLUGS,
  type DbSlug,
  isDbSlug,
  isPerPageValue,
  isSortKey,
  PER_PAGE_VALUES,
  type PerPageValue,
  SORT_KEYS,
  type SortKey,
} from "~/lib/search-scope"
import { ADVANCED_FIELDS, type AdvancedField } from "~/schemas/api-bff/llm"

export {
  DB_SLUGS,
  type DbSlug,
  isDbSlug,
  isPerPageValue,
  isSortKey,
  PER_PAGE_VALUES,
  type PerPageValue,
  SORT_KEYS,
  type SortKey,
}

export type ApiSortValue = "datePublished:asc" | "datePublished:desc"

export const sortKeyToApiSort = (key: SortKey): ApiSortValue | undefined => {
  if (key === "date_asc") return "datePublished:asc"
  if (key === "date_desc") return "datePublished:desc"

  return undefined
}

export type SyncStatus = "idle" | "syncing" | "synced" | "failed"

export {
  ADVANCED_FIELDS,
  ADVANCED_OPS,
  type AdvancedField,
  type AdvancedOp,
} from "~/schemas/api-bff/llm"

export const isAdvancedField = (value: string): value is AdvancedField =>
  (ADVANCED_FIELDS as readonly string[]).includes(value)

export const DATE_FIELDS: readonly AdvancedField[] = [
  "date_published",
  "date_modified",
  "date_created",
]

export const isDateField = (value: AdvancedField): boolean =>
  DATE_FIELDS.includes(value)

export type AdvancedCombinator = "AND" | "OR" | "NOT"
