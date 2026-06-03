import type { FacetName } from "~/lib/api"

import { FIELD_REGISTRY, type FieldDef, type FieldKey, type Scope, SCOPE_FIELDS, scopeOf } from "../field-registry"
import type { DbSlug } from "../types"

// Sidebar filter rows per scope, derived from the shared field registry
// (`../field-registry.ts`). The registry decides which fields exist and their DSL
// type / facetability / label; this module only turns that into per-scope rows
// (render kind + AST operator) for docs/search.md § Sidebar facet. The API decides
// the facet candidate values; this only decides presentation and AST mapping.

export type FilterRowKind = "facet" | "text" | "dateRange" | "numberRange"

// AST leaf operator the row emits. enum/identifier → eq, text → contains,
// date/number → between (mirrors ddbj-search-api allowlist operator matrix).
export type FilterOp = "eq" | "contains" | "between"

export type FilterRow = {
  // Stable key within a scope; also the i18n label key under search.fields.
  key: string
  kind: FilterRowKind
  // DSL field name emitted into the AST.
  dslField: string
  op: FilterOp
  // DbPortalFacets key + `facets` request name. Present only for kind "facet".
  facetName?: FacetName
  // organism facet displays the bucket `label` (scientific name) instead of value.
  organism?: boolean
}

// Render kind from the field's DSL type: date/number get range controls, facetable
// fields (enum or text with a facetName) get checkboxes, the rest a text input.
const rowKind = (def: FieldDef): FilterRowKind => {
  if (def.type === "date") return "dateRange"
  if (def.type === "number") return "numberRange"
  if (def.facetName !== undefined) return "facet"

  return "text"
}

// AST operator from the DSL type: text → contains (analyzed match), date/number →
// between (range), enum/identifier → eq (keyword exact).
const rowOp = (def: FieldDef): FilterOp => {
  if (def.type === "date" || def.type === "number") return "between"
  if (def.type === "text") return "contains"

  return "eq"
}

const toRow = (field: FieldKey): FilterRow => {
  const def: FieldDef = FIELD_REGISTRY[field]

  return {
    key: def.labelKey,
    kind: rowKind(def),
    dslField: field,
    op: rowOp(def),
    ...(def.facetName !== undefined ? { facetName: def.facetName } : {}),
    ...(def.organism ? { organism: true } : {}),
  }
}

// Per-scope rows resolved from the registry layout (cross + each DB). The code
// SSOT for which rows appear, in which order, with what render kind / AST mapping.
const buildScopeFilters = (): Record<Scope, readonly FilterRow[]> => {
  const out = {} as Record<Scope, readonly FilterRow[]>
  for (const scope of Object.keys(SCOPE_FIELDS) as Scope[]) out[scope] = SCOPE_FIELDS[scope].map(toRow)

  return out
}

export const SCOPE_FILTERS = buildScopeFilters()

export const scopeFilters = (db: DbSlug | null): readonly FilterRow[] =>
  SCOPE_FILTERS[scopeOf(db)]

// Comma-separated `facets` request param for a scope (the facet rows' API names).
// Empty string when the scope has no facet rows (caller omits the param).
export const scopeFacetParam = (db: DbSlug | null): string =>
  scopeFilters(db)
    .filter((row) => row.kind === "facet")
    .map((row) => row.facetName)
    .join(",")

// dslField → row lookup for a scope (used to route AST leaves back to rows).
export const rowByDslField = (db: DbSlug | null): Map<string, FilterRow> => {
  const map = new Map<string, FilterRow>()
  for (const row of scopeFilters(db)) map.set(row.dslField, row)

  return map
}
