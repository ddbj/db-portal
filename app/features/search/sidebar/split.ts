import type { ParseNode } from "~/lib/api"

import { identityAst } from "../ast/identity"
import { mergeAstAnd } from "../ast/merge"
import type { DbSlug } from "../types"
import { matchDatePreset } from "./date-preset"
import { type FilterRow, rowByDslField } from "./facet-config"
import { createInitialSearchFacetState, type SearchFacetState } from "./facet-state"

type SplitResult = {
  sidebar: SearchFacetState
  rest: ParseNode
}

const pushFacet = (sidebar: SearchFacetState, row: FilterRow, value: string): void => {
  sidebar.facets[row.key] = [...(sidebar.facets[row.key] ?? []), value]
}

// All rules are leaf eq/contains over the same field → the field's values
// (a facet multi-select serializes to OR of same-field leaves).
const orFieldValues = (node: ParseNode): { field: string; op: string; values: string[] } | null => {
  if (node.op !== "OR") return null
  let field: string | null = null
  let op: string | null = null
  const values: string[] = []
  for (const rule of node.rules) {
    if (rule.op !== "eq" && rule.op !== "contains") return null
    if (field === null) {
      field = rule.field
      op = rule.op
    } else if (rule.field !== field || rule.op !== op) {
      return null
    }
    values.push(rule.value)
  }

  return field !== null && op !== null ? { field, op, values } : null
}

const classify = (
  node: ParseNode,
  rowMap: Map<string, FilterRow>,
  sidebar: SearchFacetState,
  now: Date,
): boolean => {
  if (node.op === "eq" || node.op === "contains") {
    const row = rowMap.get(node.field)
    if (!row || row.op !== node.op) return false
    if (row.kind === "facet") {
      pushFacet(sidebar, row, node.value)

      return true
    }
    if (row.kind === "text") {
      sidebar.texts[row.key] = node.value

      return true
    }

    return false
  }
  if (node.op === "between") {
    const row = rowMap.get(node.field)
    if (!row) return false
    if (row.kind === "dateRange") {
      // Recover the preset the absolute window matches (relative to now) so a
      // "1y/5y/10y" selection survives the URL round-trip; otherwise it is a
      // custom range carrying its own bounds.
      const active = matchDatePreset(node.from, node.to, now)
      sidebar.dateRanges[row.key] = active === "custom"
        ? { active, from: node.from, to: node.to }
        : { active, from: "", to: "" }

      return true
    }
    if (row.kind === "numberRange") {
      sidebar.ranges[row.key] = { from: node.from, to: node.to }

      return true
    }

    return false
  }
  const orGroup = orFieldValues(node)
  if (orGroup) {
    const row = rowMap.get(orGroup.field)
    if (row && row.kind === "facet" && row.op === orGroup.op) {
      for (const value of orGroup.values) pushFacet(sidebar, row, value)

      return true
    }
  }

  return false
}

export const splitForSidebar = (
  ast: ParseNode,
  db: DbSlug | null = null,
  now: Date = new Date(),
): SplitResult => {
  const rowMap = rowByDslField(db)
  const sidebar = createInitialSearchFacetState()
  const remaining: ParseNode[] = []
  if (ast.op === "AND") {
    for (const child of ast.rules) {
      if (!classify(child, rowMap, sidebar, now)) remaining.push(child)
    }
  } else if (!classify(ast, rowMap, sidebar, now)) {
    remaining.push(ast)
  }
  const rest = remaining.length === 0 ? identityAst : mergeAstAnd(...remaining)

  return { sidebar, rest }
}
