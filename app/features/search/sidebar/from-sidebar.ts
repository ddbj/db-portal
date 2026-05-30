import type { ParseNode } from "~/lib/api"
import type { DateRangeKey } from "~/ui"

import { canonicalizeAst } from "../ast/canonicalize"
import { identityAst } from "../ast/identity"
import { mergeAstAnd } from "../ast/merge"
import type { DbSlug } from "../types"
import { type FilterRow, scopeFilters } from "./facet-config"
import type { DatePublishedFilter, SearchFacetState } from "./facet-state"

export type FromSidebarOptions = {
  db?: DbSlug | null
}

type LeafOp = "eq" | "contains"

const presetRangeToDates = (key: DateRangeKey, today: Date): { from: string; to: string } | null => {
  if (key === "all") return null
  const to = today.toISOString().slice(0, 10)
  const fromDate = new Date(today)
  switch (key) {
    case "1y":
      fromDate.setFullYear(today.getFullYear() - 1)
      break
    case "5y":
      fromDate.setFullYear(today.getFullYear() - 5)
      break
    case "10y":
      fromDate.setFullYear(today.getFullYear() - 10)
      break
  }
  const from = fromDate.toISOString().slice(0, 10)

  return { from, to }
}

const dateRangeToAst = (
  field: string,
  filter: DatePublishedFilter,
  now: Date,
): ParseNode | null => {
  if (filter.active !== "all") {
    const preset = presetRangeToDates(filter.active, now)
    if (preset) return { op: "between", field, from: preset.from, to: preset.to }
  }
  if (filter.from !== "" && filter.to !== "") {
    return { op: "between", field, from: filter.from, to: filter.to }
  }

  return null
}

const leaf = (op: LeafOp, field: string, value: string): ParseNode => ({ op, field, value })

const facetToAst = (row: FilterRow, values: readonly string[]): ParseNode | null => {
  const op = row.op as LeafOp
  const vals = values.filter((v) => v !== "")
  if (vals.length === 0) return null
  if (vals.length === 1) return leaf(op, row.dslField, vals[0] as string)

  return { op: "OR", rules: vals.map((value) => leaf(op, row.dslField, value)) }
}

const rowToAst = (row: FilterRow, state: SearchFacetState, now: Date): ParseNode | null => {
  switch (row.kind) {
    case "facet":
      return facetToAst(row, state.facets[row.key] ?? [])
    case "text": {
      const value = (state.texts[row.key] ?? "").trim()

      return value === "" ? null : leaf(row.op as LeafOp, row.dslField, value)
    }
    case "dateRange":
      return dateRangeToAst(row.dslField, state.datePublished, now)
    case "numberRange": {
      const range = state.ranges[row.key]
      if (!range || range.from === "" || range.to === "") return null

      return { op: "between", field: row.dslField, from: range.from, to: range.to }
    }
  }
}

export const fromSidebar = (
  state: SearchFacetState,
  options: FromSidebarOptions = {},
  now: Date = new Date(),
): ParseNode => {
  const parts: ParseNode[] = []
  for (const row of scopeFilters(options.db ?? null)) {
    const node = rowToAst(row, state, now)
    if (node) parts.push(node)
  }
  if (parts.length === 0) return identityAst

  return canonicalizeAst(mergeAstAnd(...parts))
}
