import { sidebarFieldsForDb } from "@/lib/sidebar-fields"
import type {
  DateAxis,
  SidebarDateRange,
  SidebarState,
} from "@/lib/sidebar-state-types"
import { EMPTY_SIDEBAR_STATE } from "@/lib/sidebar-state-types"
import type { DbId } from "@/types/db"

import { boolAnd } from "./factory"
import {
  isBoolOp,
  isFieldClause,
  type SearchAstNode,
} from "./types"

interface MutableSidebar {
  facets: Record<string, string[]>
  keywords: Record<string, string>
  dateRange: SidebarDateRange | null
  subtype: string | null
}

export interface AstSplitResult {
  readonly sidebar: SidebarState
  readonly residual: SearchAstNode | null
}

const tryConsume = (
  node: SearchAstNode,
  db: DbId,
  acc: MutableSidebar,
): boolean => {
  const fields = sidebarFieldsForDb(db, acc.subtype)

  if (isFieldClause(node) && node.op === "eq") {
    if (node.field === "type" && fields.subtype) {
      if (acc.subtype !== null && acc.subtype !== node.value) return false
      acc.subtype = node.value

      return true
    }
    const found = fields.facets.find((f) => f.dslName === node.field)
    if (found !== undefined) {
      const arr = acc.facets[node.field] ?? []
      arr.push(node.value)
      acc.facets[node.field] = arr

      return true
    }

    return false
  }

  if (isFieldClause(node) && node.op === "contains") {
    if (fields.keywords.some((k) => k.dslName === node.field)) {
      acc.keywords[node.field] = node.value

      return true
    }

    return false
  }

  if (isFieldClause(node) && node.op === "between") {
    if (
      acc.dateRange === null
      && fields.dateAxes.includes(node.field as DateAxis)
    ) {
      acc.dateRange = {
        axis: node.field as DateAxis,
        from: node.from,
        to: node.to,
      }

      return true
    }

    return false
  }

  if (isBoolOp(node) && node.op === "OR") {
    const first = node.children[0]
    if (
      first === undefined
      || !isFieldClause(first)
      || first.op !== "eq"
    ) {
      return false
    }
    const candidateField = first.field
    const allMatch = node.children.every(
      (c) => isFieldClause(c) && c.op === "eq" && c.field === candidateField,
    )
    if (!allMatch) return false
    if (candidateField === "type") return false
    const found = fields.facets.find((f) => f.dslName === candidateField)
    if (found === undefined) return false
    const arr = acc.facets[candidateField] ?? []
    for (const child of node.children) {
      if (isFieldClause(child) && child.op === "eq") arr.push(child.value)
    }
    acc.facets[candidateField] = arr

    return true
  }

  return false
}

export const splitAstForSidebar = (
  ast: SearchAstNode | null,
  db: DbId,
): AstSplitResult => {
  if (ast === null) return { sidebar: EMPTY_SIDEBAR_STATE, residual: null }

  const acc: MutableSidebar = {
    facets: {},
    keywords: {},
    dateRange: null,
    subtype: null,
  }

  const candidates: SearchAstNode[] = isBoolOp(ast) && ast.op === "AND"
    ? [...ast.children]
    : [ast]

  for (const child of candidates) {
    if (
      isFieldClause(child)
      && child.op === "eq"
      && child.field === "type"
    ) {
      const baseFields = sidebarFieldsForDb(db, null)
      if (baseFields.subtype) {
        acc.subtype = child.value
        break
      }
    }
  }

  const residualChildren: SearchAstNode[] = []
  for (const child of candidates) {
    const consumed = tryConsume(child, db, acc)
    if (!consumed) residualChildren.push(child)
  }

  let residual: SearchAstNode | null = null
  if (residualChildren.length === 1) {
    const [first] = residualChildren
    residual = first ?? null
  } else if (residualChildren.length > 1) {
    residual = boolAnd(residualChildren)
  }

  return {
    sidebar: {
      facets: acc.facets,
      keywords: acc.keywords,
      dateRange: acc.dateRange,
      subtype: acc.subtype,
    },
    residual,
  }
}
