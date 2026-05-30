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
import { ADVANCED_FIELDS, type AdvancedField, type AdvancedOp } from "~/schemas/api-bff/llm"

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

// Operators each field accepts, mirroring the ddbj-search-api DSL allowlist
// (search/dsl/allowlist.py). Picking an unlisted operator yields a 400, so the
// builder restricts the operator choices per field.
export const FIELD_OPS: Record<AdvancedField, readonly AdvancedOp[]> = {
  identifier: ["eq", "wildcard"],
  title: ["eq", "contains"],
  description: ["eq", "contains"],
  organism_id: ["eq", "wildcard"],
  organism_name: ["eq", "contains"],
  accessibility: ["eq"],
  date_published: ["between"],
  date_modified: ["between"],
  date_created: ["between"],
  submitter: ["eq", "contains"],
  publication: ["eq", "contains"],
}

export type AdvancedCombinator = "AND" | "OR" | "NOT"

// A predicate is an operator paired with whether the condition is negated. The
// builder folds op selection and negation into one dropdown ("を含む" /
// "を含まない" 等) so a row reads as a clause; negation maps to a NOT wrapper in
// the AST, not to a separate operator (the DSL allowlist has no neq/not_contains).
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

// i18n key under search.builder.field for a given field (the resource keys are
// camelCase while AdvancedField values are snake_case).
export type FieldLabelKey =
  | "identifier"
  | "title"
  | "description"
  | "organismId"
  | "organismName"
  | "accessibility"
  | "datePublished"
  | "dateModified"
  | "dateCreated"
  | "submitter"
  | "publication"

export const fieldLabelKey = (field: AdvancedField): FieldLabelKey => {
  switch (field) {
    case "organism_id":
      return "organismId"
    case "organism_name":
      return "organismName"
    case "date_published":
      return "datePublished"
    case "date_modified":
      return "dateModified"
    case "date_created":
      return "dateCreated"
    case "identifier":
    case "title":
    case "description":
    case "accessibility":
    case "submitter":
    case "publication":
      return field
  }
}

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
