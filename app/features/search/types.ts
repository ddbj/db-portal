import {
  DB_SLUGS,
  type DbSlug,
  isDbSlug,
  maxReachablePage,
  PER_PAGE_VALUES,
  type PerPageValue,
  reachablePageCount,
  SEARCH_HARD_LIMIT,
  SORT_KEYS,
  type SortKey,
} from "~/lib/search-scope"
import { type AdvancedOp } from "~/schemas/api-bff/llm"

import {
  type AdvancedField,
  FIELD_OPS,
  fieldLabelKey,
  fieldsForScope,
  isAdvancedField,
  isDateField,
  isNumberField,
} from "./advanced/field-catalog"

export {
  DB_SLUGS,
  type DbSlug,
  isDbSlug,
  maxReachablePage,
  PER_PAGE_VALUES,
  type PerPageValue,
  reachablePageCount,
  SEARCH_HARD_LIMIT,
  SORT_KEYS,
  type SortKey,
}

export {
  type AdvancedField,
  type AdvancedOp,
  FIELD_OPS,
  fieldLabelKey,
  fieldsForScope,
  isAdvancedField,
  isDateField,
  isNumberField,
}

type ApiSortValue = "datePublished:asc" | "datePublished:desc"

export const sortKeyToApiSort = (key: SortKey): ApiSortValue | undefined => {
  if (key === "date_asc") return "datePublished:asc"
  if (key === "date_desc") return "datePublished:desc"

  return undefined
}

export type SyncStatus = "idle" | "syncing" | "synced" | "failed"

export type AdvancedCombinator = "AND" | "OR" | "NOT"

// A predicate is an operator paired with whether the condition is negated. The
// builder folds op selection and negation into one dropdown ("keyword" /
// "not keyword" etc.) so a row reads as a clause; negation maps to a NOT wrapper
// in the AST, not to a separate operator (the DSL allowlist has no neq/not_contains).
export type Predicate = { op: AdvancedOp; negated: boolean }

export const predicateValue = ({ op, negated }: Predicate): string =>
  negated ? `not:${op}` : op

export const parsePredicate = (value: string): Predicate =>
  value.startsWith("not:")
    ? { op: value.slice(4) as AdvancedOp, negated: true }
    : { op: value as AdvancedOp, negated: false }

export const fieldPredicates = (field: AdvancedField): readonly Predicate[] =>
  FIELD_OPS[field].flatMap((op) => [
    { op, negated: false },
    { op, negated: true },
  ])

// i18n key under search.builder.predicate for a given op + negation.
export const predicateLabelKey = ({ op, negated }: Predicate): string => {
  const positive: Record<AdvancedOp, string> = {
    eq: "eq",
    contains: "contains",
    wildcard: "wildcard",
    between: "between",
  }
  const negative: Record<AdvancedOp, string> = {
    eq: "notEq",
    contains: "notContains",
    wildcard: "notWildcard",
    between: "notBetween",
  }

  return negated ? negative[op] : positive[op]
}
