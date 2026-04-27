import type { ParseResponse } from "@/lib/api"
import { ADVANCED_FIELDS } from "@/lib/mock-data/advanced-search-fields"
import type { DbSelectValue } from "@/lib/search-url"
import { ALL_DB_VALUE } from "@/lib/search-url"
import type { DbId } from "@/types/db"
import type {
  AdvancedCondition,
  FieldOperator,
  LogicOperator,
} from "@/types/search"

import type {
  AdvancedConditionNode,
  AdvancedGroupNode,
  AdvancedNodeWithId,
} from "./types"

type ParseAst = ParseResponse["ast"]
type AstBoolOp = Extract<ParseAst, { op: "AND" | "OR" | "NOT" }>
type AstLeaf = Exclude<ParseAst, AstBoolOp>
type AstLeafRange = Extract<AstLeaf, { from: string }>
type AstLeafValue = Exclude<AstLeaf, AstLeafRange>

const isBoolOp = (node: ParseAst): node is AstBoolOp => "rules" in node
const isLeafRange = (node: AstLeaf): node is AstLeafRange =>
  "from" in node && "to" in node

const API_OP_TO_PORTAL_OP: Readonly<Record<string, FieldOperator>> = {
  eq: "equals",
  contains: "contains",
  wildcard: "wildcard",
  between: "between",
}

const resolveFieldId = (
  apiField: string,
  db: DbSelectValue,
): string | null => {
  const matches = ADVANCED_FIELDS.filter((f) => f.dslName === apiField)
  if (matches.length === 0) return null
  if (matches.length === 1) return matches[0]?.id ?? null
  if (db !== ALL_DB_VALUE) {
    const dbMatch = matches.find((f) => f.availableDbs.includes(db as DbId))
    if (dbMatch !== undefined) return dbMatch.id
  }

  return matches[0]?.id ?? null
}

let counter = 0
const nextId = (): string => {
  counter += 1

  return `parsed-${counter}`
}

const astLeafToCondition = (
  leaf: AstLeaf,
  db: DbSelectValue,
): AdvancedConditionNode | null => {
  const fieldId = resolveFieldId(leaf.field, db)
  if (fieldId === null) return null
  const portalOp = API_OP_TO_PORTAL_OP[leaf.op]
  if (portalOp === undefined) return null
  const value: AdvancedCondition["value"] = isLeafRange(leaf)
    ? { from: leaf.from, to: leaf.to }
    : (leaf as AstLeafValue).value

  return {
    id: nextId(),
    kind: "condition",
    condition: { field: fieldId, operator: portalOp, value },
  }
}

const astToNode = (
  ast: ParseAst,
  db: DbSelectValue,
): AdvancedNodeWithId | null => {
  if (isBoolOp(ast)) {
    const children = ast.rules
      .map((c) => astToNode(c, db))
      .filter((n): n is AdvancedNodeWithId => n !== null)

    return {
      id: nextId(),
      kind: "group",
      logic: ast.op as LogicOperator,
      children,
    }
  }

  return astLeafToCondition(ast, db)
}

export const buildTreeFromAst = (
  ast: ParseAst,
  db: DbSelectValue,
): AdvancedGroupNode => {
  counter = 0
  const root = astToNode(ast, db)
  if (root === null) {
    return { id: "root", kind: "group", logic: "AND", children: [] }
  }
  if (root.kind === "condition") {
    return { id: "root", kind: "group", logic: "AND", children: [root] }
  }

  return { ...root, id: "root" }
}
