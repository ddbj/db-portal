import type { DbSlug } from "~/lib/search-scope"
import type { AdvancedOp } from "~/schemas/api-bff/llm"

import { FIELD_REGISTRY, type FieldKey, type FieldType, SCOPE_FIELDS, scopeOf } from "../field-registry"

// The Advanced builder's field dropdown is derived from the shared field registry
// (`../field-registry.ts`), so it offers exactly the fields the Sidebar shows for
// each scope. This module only adds the builder-specific op affordances.

// Operators the builder offers per field type — the UI affordance set, a subset of
// what the API allowlist (search/dsl/allowlist.py, OPERATOR_BY_KIND) accepts,
// restricted to ops representable in the DSL. text omits the redundant eq (the API
// folds it into contains); date / number stay range-only (between) by UI design
// though the API also allows an exact eq.
const KIND_OPS: Record<FieldType, readonly AdvancedOp[]> = {
  identifier: ["eq", "wildcard"],
  text: ["contains", "wildcard"],
  enum: ["eq"],
  date: ["between"],
  number: ["between"],
}

export type AdvancedField = FieldKey

const FIELD_KEYS = Object.keys(FIELD_REGISTRY) as AdvancedField[]

export const FIELD_OPS = Object.fromEntries(
  FIELD_KEYS.map((field) => [field, KIND_OPS[FIELD_REGISTRY[field].type]]),
) as Record<AdvancedField, readonly AdvancedOp[]>

export const fieldLabelKey = (field: AdvancedField): string => FIELD_REGISTRY[field].labelKey

export const isDateField = (field: AdvancedField): boolean => FIELD_REGISTRY[field].type === "date"

export const isNumberField = (field: AdvancedField): boolean => FIELD_REGISTRY[field].type === "number"

export const isAdvancedField = (value: string): value is AdvancedField =>
  Object.prototype.hasOwnProperty.call(FIELD_REGISTRY, value)

// Fields the builder offers when `db` is the active scope: the scope's field list
// from the shared registry (cross when db is null). Identical to the Sidebar's
// scope membership, so the two surfaces stay aligned by construction.
export const fieldsForScope = (db: DbSlug | null): readonly AdvancedField[] => SCOPE_FIELDS[scopeOf(db)]
