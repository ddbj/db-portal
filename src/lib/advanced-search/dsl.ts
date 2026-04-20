import { findField } from "@/lib/mock-data/advanced-search-fields"
import type {
  AdvancedCondition,
  AdvancedFieldType,
} from "@/types/search"

import type { AdvancedGroupNode, AdvancedNodeWithId } from "./types"
import { MAX_NEST_DEPTH } from "./types"

export { MAX_NEST_DEPTH }

const NON_PHRASE_VALID = /^[A-Za-z0-9_]+$/

export const needsPhrase = (value: string): boolean =>
  !NON_PHRASE_VALID.test(value)

export const escapePhrase = (value: string): string =>
  value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")

const formatAtomValue = (value: string, type: AdvancedFieldType): string => {
  if (type === "date" || type === "number") return value

  return needsPhrase(value) ? `"${escapePhrase(value)}"` : value
}

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

export const conditionToDsl = (condition: AdvancedCondition): string => {
  const field = findField(condition.field)
  if (field === undefined) return ""

  const { dslName, type } = field
  const op = condition.operator
  const val = condition.value

  if (op === "between") {
    if (!isBetweenValue(val)) return ""
    if (val.from === "" && val.to === "") return ""

    return `${dslName}:[${val.from} TO ${val.to}]`
  }

  if (op === "gte") {
    const s = extractStringValue(val)
    if (s === "") return ""

    return `${dslName}:[${s} TO *]`
  }

  if (op === "lte") {
    const s = extractStringValue(val)
    if (s === "") return ""

    return `${dslName}:[* TO ${s}]`
  }

  const s = extractStringValue(val)
  if (s === "") return ""

  if (op === "wildcard") {
    return `${dslName}:${s}`
  }
  if (op === "starts_with") {
    return `${dslName}:${s}*`
  }
  if (op === "not_equals") {
    return `NOT ${dslName}:${formatAtomValue(s, type)}`
  }

  return `${dslName}:${formatAtomValue(s, type)}`
}

const serializeChild = (child: AdvancedNodeWithId): string => {
  if (child.kind === "condition") return conditionToDsl(child.condition)
  const inner = groupInnerDsl(child)
  if (inner === "") return ""

  return `(${inner})`
}

const groupInnerDsl = (group: AdvancedGroupNode): string => {
  if (group.logic === "NOT") {
    const first = group.children[0]
    if (first === undefined) return ""
    const inner = first.kind === "group"
      ? serializeChild(first)
      : conditionToDsl(first.condition)
    if (inner === "") return ""

    return `NOT ${inner}`
  }

  const parts = group.children
    .map((c) => (c.kind === "group" ? serializeChild(c) : conditionToDsl(c.condition)))
    .filter((s) => s !== "")
  if (parts.length === 0) return ""
  const [first] = parts
  if (parts.length === 1 && first !== undefined) return first

  return parts.join(` ${group.logic} `)
}

export const nodeToDsl = (node: AdvancedNodeWithId): string => {
  if (node.kind === "condition") return conditionToDsl(node.condition)

  return groupInnerDsl(node)
}

export const countDepth = (node: AdvancedNodeWithId): number => {
  if (node.kind === "condition") return 0
  if (node.children.length === 0) return 1

  return 1 + Math.max(...node.children.map(countDepth))
}
