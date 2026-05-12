import type {
  AdvancedGroupNode,
  AdvancedNodeWithId,
} from "@/lib/advanced-search/types"
import { findField } from "@/lib/mock-data/advanced-search-fields"
import type { AdvancedCondition } from "@/types/search"

import {
  boolAnd,
  boolNot,
  boolOr,
  fieldBetween,
  fieldContains,
  fieldEq,
  fieldWildcard,
  freeText,
} from "./factory"
import { isFreeText, type SearchAstNode } from "./types"

const isBetweenValue = (
  v: AdvancedCondition["value"],
): v is { from: string; to: string } =>
  typeof v === "object" && v !== null && !Array.isArray(v)
  && "from" in v && "to" in v

const extractStringValue = (v: AdvancedCondition["value"]): string => {
  if (typeof v === "string") return v
  if (isBetweenValue(v)) return v.from
  if (Array.isArray(v)) return v.join(" ")

  return ""
}

const conditionToAst = (
  condition: AdvancedCondition,
): SearchAstNode | null => {
  const field = findField(condition.field)
  if (field === undefined) return null
  const { dslName } = field
  const op = condition.operator
  const val = condition.value

  if (op === "between") {
    if (!isBetweenValue(val)) return null
    if (val.from === "" && val.to === "") return null
    if (val.from === "" || val.to === "") return null

    return fieldBetween(dslName, val.from, val.to)
  }
  if (op === "gte") {
    const s = extractStringValue(val)
    if (s === "") return null

    return fieldBetween(dslName, s, "*")
  }
  if (op === "lte") {
    const s = extractStringValue(val)
    if (s === "") return null

    return fieldBetween(dslName, "*", s)
  }

  const s = extractStringValue(val)
  if (s === "") return null

  if (op === "wildcard") return fieldWildcard(dslName, s)
  if (op === "starts_with") return fieldWildcard(dslName, `${s}*`)
  if (op === "not_equals") return boolNot(fieldEq(dslName, s))
  if (op === "contains") return fieldContains(dslName, s)

  return fieldEq(dslName, s)
}

const nodeToAst = (node: AdvancedNodeWithId): SearchAstNode | null => {
  if (node.kind === "condition") return conditionToAst(node.condition)
  if (node.kind === "free_text") {
    const trimmed = node.value.trim()
    if (trimmed === "") return null

    return freeText(trimmed)
  }

  return groupToAst(node)
}

const groupToAst = (group: AdvancedGroupNode): SearchAstNode | null => {
  const childAsts = group.children
    .map(nodeToAst)
    .filter((a): a is SearchAstNode => a !== null)
  if (childAsts.length === 0) return null
  if (group.logic === "NOT") {
    const [first] = childAsts
    if (first === undefined) return null

    return boolNot(first)
  }
  if (childAsts.length === 1) {
    const [only] = childAsts
    if (only !== undefined) return only
  }
  if (group.logic === "AND") {
    const ft = childAsts.filter(isFreeText)
    const others = childAsts.filter((c) => !isFreeText(c))

    return boolAnd([...ft, ...others])
  }

  return boolOr(childAsts)
}

export const advancedTreeToAst = (
  tree: AdvancedGroupNode,
): SearchAstNode | null => groupToAst(tree)
