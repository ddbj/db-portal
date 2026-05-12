import type {
  FacetSelection,
  SidebarDateRange,
  SidebarState,
} from "@/lib/sidebar-state-types"

import {
  boolAnd,
  boolOr,
  fieldBetween,
  fieldContains,
  fieldEq,
  freeText,
} from "./factory"
import type { SearchAstNode } from "./types"

const buildFacetClause = (
  field: string,
  values: FacetSelection,
): SearchAstNode | null => {
  if (values.length === 0) return null
  const first = values[0]
  if (values.length === 1 && first !== undefined) {
    return fieldEq(field, first)
  }

  return boolOr(values.map((v) => fieldEq(field, v)))
}

const buildKeywordClause = (
  field: string,
  value: string,
): SearchAstNode | null => {
  const trimmed = value.trim()
  if (trimmed === "") return null

  return fieldContains(field, trimmed)
}

const buildDateRangeClause = (
  range: SidebarDateRange,
): SearchAstNode | null => {
  if (range.from === "" && range.to === "") return null
  if (range.from !== "" && range.to !== "") {
    return fieldBetween(range.axis, range.from, range.to)
  }
  if (range.from !== "") {
    return fieldBetween(range.axis, range.from, "*")
  }

  return fieldBetween(range.axis, "*", range.to)
}

export const sidebarStateToAst = (
  state: SidebarState,
): SearchAstNode | null => {
  const clauses: SearchAstNode[] = []

  const freeTextTrimmed = state.freeText.trim()
  if (freeTextTrimmed !== "") {
    clauses.push(freeText(freeTextTrimmed))
  }

  for (const [field, values] of Object.entries(state.facets)) {
    const c = buildFacetClause(field, values)
    if (c !== null) clauses.push(c)
  }
  for (const [field, value] of Object.entries(state.keywords)) {
    const c = buildKeywordClause(field, value)
    if (c !== null) clauses.push(c)
  }
  if (state.dateRange !== null) {
    const c = buildDateRangeClause(state.dateRange)
    if (c !== null) clauses.push(c)
  }
  if (state.subtype !== null && state.subtype !== "") {
    clauses.push(fieldEq("type", state.subtype))
  }

  if (clauses.length === 0) return null
  if (clauses.length === 1) {
    const [only] = clauses
    if (only !== undefined) return only
  }

  return boolAnd(clauses)
}
