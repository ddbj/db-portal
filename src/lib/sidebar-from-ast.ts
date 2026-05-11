import type { components } from "@/lib/api/schema.gen"
import type {
  DateAxis,
  SidebarDateRange,
  SidebarState,
} from "@/lib/search-dsl-builder"
import { sidebarFieldsForDb } from "@/lib/sidebar-fields"
import type { DbId } from "@/types/db"

export type ParseAst = components["schemas"]["DbPortalParseResponse"]["ast"]
export type ParseLeafValue = components["schemas"]["DbPortalParseLeafValue"]
export type ParseLeafRange = components["schemas"]["DbPortalParseLeafRange"]
export type ParseBoolOp = components["schemas"]["DbPortalParseBoolOp"]

export const isParseLeafValue = (n: ParseAst): n is ParseLeafValue =>
  "value" in n
  && (n.op === "eq" || n.op === "contains" || n.op === "wildcard")

export const isParseLeafRange = (n: ParseAst): n is ParseLeafRange =>
  "from" in n && "to" in n && n.op === "between"

export const isParseBoolOp = (n: ParseAst): n is ParseBoolOp =>
  "rules" in n && (n.op === "AND" || n.op === "OR" || n.op === "NOT")

export interface AstSplitResult {
  readonly sidebar: SidebarState
  readonly residual: ParseAst | null
}

const EMPTY_SIDEBAR: SidebarState = {
  facets: {},
  keywords: {},
  dateRange: null,
  subtype: null,
}

interface MutableSidebar {
  facets: Record<string, string[]>
  keywords: Record<string, string>
  dateRange: SidebarDateRange | null
  subtype: string | null
}

const NON_PHRASE_VALID = /^[A-Za-z0-9_]+$/
const needsPhrase = (value: string): boolean => !NON_PHRASE_VALID.test(value)
const escape = (value: string): string =>
  value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")
const quote = (value: string): string =>
  needsPhrase(value) ? `"${escape(value)}"` : value

export const astToDsl = (ast: ParseAst): string => {
  if (isParseLeafValue(ast)) {
    if (ast.op === "eq") {
      return `${ast.field} equals ${quote(ast.value)}`
    }
    if (ast.op === "contains") {
      return `${ast.field} contains ${quote(ast.value)}`
    }

    return `${ast.field} wildcard ${quote(ast.value)}`
  }
  if (isParseLeafRange(ast)) {
    return `${ast.field} between ${quote(ast.from)} and ${quote(ast.to)}`
  }
  if (isParseBoolOp(ast)) {
    if (ast.op === "NOT") {
      const child = ast.rules[0]
      if (child === undefined) return ""

      return `not (${astToDsl(child)})`
    }
    const parts = ast.rules
      .map((r) => astToDsl(r))
      .filter((s) => s !== "")
      .map((s) => `(${s})`)
    if (parts.length === 0) return ""
    if (parts.length === 1) {
      const [only] = parts
      if (only !== undefined) return only
    }

    return parts.join(` ${ast.op.toLowerCase()} `)
  }

  return ""
}

const tryConsume = (
  node: ParseAst,
  db: DbId,
  acc: MutableSidebar,
): boolean => {
  const fields = sidebarFieldsForDb(db, acc.subtype)

  if (isParseLeafValue(node) && node.op === "eq") {
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

  if (isParseLeafValue(node) && node.op === "contains") {
    if (fields.keywords.some((k) => k.dslName === node.field)) {
      acc.keywords[node.field] = node.value

      return true
    }

    return false
  }

  if (isParseLeafRange(node)) {
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

  if (isParseBoolOp(node) && node.op === "OR") {
    const first = node.rules[0]
    if (first === undefined) return false
    if (!isParseLeafValue(first) || first.op !== "eq") return false
    const candidateField = first.field
    const allMatch = node.rules.every(
      (r) =>
        isParseLeafValue(r) && r.op === "eq" && r.field === candidateField,
    )
    if (!allMatch) return false
    if (candidateField === "type") return false
    const found = fields.facets.find((f) => f.dslName === candidateField)
    if (found === undefined) return false
    const arr = acc.facets[candidateField] ?? []
    for (const r of node.rules) {
      if (isParseLeafValue(r)) arr.push(r.value)
    }
    acc.facets[candidateField] = arr

    return true
  }

  return false
}

export const astToSidebarState = (
  ast: ParseAst | null,
  db: DbId,
): AstSplitResult => {
  if (ast === null) return { sidebar: EMPTY_SIDEBAR, residual: null }

  const acc: MutableSidebar = {
    facets: {},
    keywords: {},
    dateRange: null,
    subtype: null,
  }

  const candidates = isParseBoolOp(ast) && ast.op === "AND" ? ast.rules : [ast]

  for (const child of candidates) {
    if (
      isParseLeafValue(child)
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

  const residualChildren: ParseAst[] = []
  for (const child of candidates) {
    const consumed = tryConsume(child, db, acc)
    if (!consumed) residualChildren.push(child)
  }

  let residual: ParseAst | null = null
  if (residualChildren.length === 1) {
    const [first] = residualChildren
    residual = first ?? null
  } else if (residualChildren.length > 1) {
    residual = {
      op: "AND",
      rules: residualChildren,
    }
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
