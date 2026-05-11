import type {
  AdvancedConditionNode,
  AdvancedGroupNode,
  AdvancedNodeWithId,
} from "@/lib/advanced-search/types"
import { ADVANCED_FIELDS } from "@/lib/mock-data/advanced-search-fields"
import { ALL_DB_VALUE, type DbSelectValue } from "@/lib/search-url"
import type { DbId } from "@/types/db"
import type { AdvancedCondition, FieldOperator } from "@/types/search"

import {
  type FieldClauseLeafNode,
  type FieldClauseRangeNode,
  isBoolOp,
  isFieldClause,
  isFieldRange,
  isFreeText,
  type SearchAstNode,
} from "./types"

const isStartsWithValue = (value: string): boolean => {
  if (value.length < 2) return false
  if (!value.endsWith("*")) return false
  const prefix = value.slice(0, -1)

  return !prefix.includes("*") && !prefix.includes("?")
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
const nextParsedId = (): string => {
  counter += 1

  return `parsed-${counter}`
}

const fieldLeafToCondition = (
  leaf: FieldClauseLeafNode,
  db: DbSelectValue,
): AdvancedConditionNode | null => {
  const fieldId = resolveFieldId(leaf.field, db)
  if (fieldId === null) return null
  let operator: FieldOperator
  let value: string = leaf.value
  if (leaf.op === "wildcard") {
    if (isStartsWithValue(leaf.value)) {
      operator = "starts_with"
      value = leaf.value.slice(0, -1)
    } else {
      operator = "wildcard"
    }
  } else if (leaf.op === "contains") {
    operator = "contains"
  } else {
    operator = "equals"
  }

  return {
    id: nextParsedId(),
    kind: "condition",
    condition: { field: fieldId, operator, value },
  }
}

const fieldRangeToCondition = (
  range: FieldClauseRangeNode,
  db: DbSelectValue,
): AdvancedConditionNode | null => {
  const fieldId = resolveFieldId(range.field, db)
  if (fieldId === null) return null
  let condition: AdvancedCondition
  if (range.from !== "*" && range.to === "*") {
    condition = { field: fieldId, operator: "gte", value: range.from }
  } else if (range.from === "*" && range.to !== "*") {
    condition = { field: fieldId, operator: "lte", value: range.to }
  } else {
    condition = {
      field: fieldId,
      operator: "between",
      value: { from: range.from, to: range.to },
    }
  }

  return { id: nextParsedId(), kind: "condition", condition }
}

const astToAdvancedNode = (
  ast: SearchAstNode,
  db: DbSelectValue,
): AdvancedNodeWithId | null => {
  if (isFreeText(ast)) {
    return null
  }
  if (isFieldClause(ast)) {
    if (isFieldRange(ast)) return fieldRangeToCondition(ast, db)

    return fieldLeafToCondition(ast, db)
  }
  if (isBoolOp(ast)) {
    if (ast.op === "NOT" && ast.children.length === 1) {
      const child = ast.children[0]
      if (
        child !== undefined
        && isFieldClause(child)
        && !isFieldRange(child)
        && child.op === "eq"
      ) {
        const fieldId = resolveFieldId(child.field, db)
        if (fieldId !== null) {
          return {
            id: nextParsedId(),
            kind: "condition",
            condition: {
              field: fieldId,
              operator: "not_equals",
              value: child.value,
            },
          }
        }
      }
    }
    const children = ast.children
      .map((c) => astToAdvancedNode(c, db))
      .filter((n): n is AdvancedNodeWithId => n !== null)

    return {
      id: nextParsedId(),
      kind: "group",
      logic: ast.op,
      children,
    }
  }

  return null
}

export const searchAstToAdvancedTree = (
  ast: SearchAstNode,
  db: DbSelectValue,
): AdvancedGroupNode => {
  counter = 0
  const root = astToAdvancedNode(ast, db)
  if (root === null) {
    return { id: "root", kind: "group", logic: "AND", children: [] }
  }
  if (root.kind === "condition") {
    return { id: "root", kind: "group", logic: "AND", children: [root] }
  }

  return { ...root, id: "root" }
}
