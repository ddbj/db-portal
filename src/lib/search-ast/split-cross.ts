import type {
  DateAxis,
  SidebarDateRange,
} from "@/lib/sidebar-state-types"
import { EMPTY_SIDEBAR_STATE } from "@/lib/sidebar-state-types"

import { boolAnd } from "./factory"
import type { AstSplitResult } from "./split"
import {
  isBoolOp,
  isFieldClause,
  isFreeText,
  type SearchAstNode,
} from "./types"

const CROSS_FACET_FIELDS: ReadonlySet<string> = new Set(["organism"])
const CROSS_DATE_AXIS: DateAxis = "date_published"

interface MutableSidebar {
  facets: Record<string, string[]>
  keywords: Record<string, string>
  dateRange: SidebarDateRange | null
  subtype: string | null
  freeText: string
}

const tryConsume = (
  node: SearchAstNode,
  acc: MutableSidebar,
): boolean => {
  if (isFreeText(node)) {
    if (acc.freeText !== "") return false
    acc.freeText = node.value

    return true
  }

  if (
    isFieldClause(node)
    && node.op === "eq"
    && CROSS_FACET_FIELDS.has(node.field)
  ) {
    const arr = acc.facets[node.field] ?? []
    arr.push(node.value)
    acc.facets[node.field] = arr

    return true
  }

  if (
    isFieldClause(node)
    && node.op === "between"
    && node.field === CROSS_DATE_AXIS
  ) {
    if (acc.dateRange !== null) return false
    acc.dateRange = {
      axis: CROSS_DATE_AXIS,
      from: node.from,
      to: node.to,
    }

    return true
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
    if (!CROSS_FACET_FIELDS.has(candidateField)) return false
    const allMatch = node.children.every(
      (c) => isFieldClause(c) && c.op === "eq" && c.field === candidateField,
    )
    if (!allMatch) return false
    const arr = acc.facets[candidateField] ?? []
    for (const child of node.children) {
      if (isFieldClause(child) && child.op === "eq") arr.push(child.value)
    }
    acc.facets[candidateField] = arr

    return true
  }

  return false
}

export const splitAstForCrossSidebar = (
  ast: SearchAstNode | null,
): AstSplitResult => {
  if (ast === null) return { sidebar: EMPTY_SIDEBAR_STATE, residual: null }

  const acc: MutableSidebar = {
    facets: {},
    keywords: {},
    dateRange: null,
    subtype: null,
    freeText: "",
  }

  const candidates: SearchAstNode[] = isBoolOp(ast) && ast.op === "AND"
    ? [...ast.children]
    : [ast]

  const residualChildren: SearchAstNode[] = []
  for (const child of candidates) {
    if (!tryConsume(child, acc)) residualChildren.push(child)
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
      freeText: acc.freeText,
    },
    residual,
  }
}
