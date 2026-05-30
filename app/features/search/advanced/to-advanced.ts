import type { ParseNode } from "~/lib/api"

import { isIdentityAst } from "../ast/identity"
import {
  type AdvancedCombinator,
  type AdvancedField,
  type AdvancedOp,
  isAdvancedField,
} from "../types"
import {
  type AdvancedCondition,
  type AdvancedGroup,
  type AdvancedInnerCombinator,
  type AdvancedNode,
  type AdvancedState,
  createCondition,
  createGroup,
} from "./reducer"

const FALLBACK_FIELD: AdvancedField = "title"

const safeField = (raw: string): AdvancedField =>
  isAdvancedField(raw) ? raw : FALLBACK_FIELD

const leafToCondition = (node: ParseNode, combinator: AdvancedCombinator): AdvancedCondition | null => {
  switch (node.op) {
    case "eq":
    case "contains":
    case "wildcard":
      return createCondition({
        combinator,
        field: safeField(node.field),
        op: node.op as AdvancedOp,
        value: node.value,
      })
    case "between":
      return createCondition({
        combinator,
        field: safeField(node.field),
        op: "between",
        from: node.from,
        to: node.to,
      })
    default:
      return null
  }
}

const childToAdvanced = (node: ParseNode, parentCombinator: AdvancedCombinator): AdvancedNode | null => {
  switch (node.op) {
    case "free_text":
      return null
    case "eq":
    case "contains":
    case "wildcard":
    case "between":
      return leafToCondition(node, parentCombinator)
    case "NOT": {
      const inner = node.rules[0]
      if (!inner) return null
      const child = childToAdvanced(inner, "NOT")
      if (!child) return null

      return { ...child, combinator: "NOT" }
    }
    case "AND":
    case "OR": {
      const innerCombinator: AdvancedInnerCombinator = node.op
      const children: AdvancedNode[] = []
      for (const rule of node.rules) {
        if (rule === undefined) continue
        // AND / OR joining lives in innerCombinator; a child's combinator only
        // carries negation, which the NOT case sets. Non-negated children are AND.
        const advanced = childToAdvanced(rule, "AND")
        if (!advanced) continue
        children.push(advanced)
      }
      if (children.length === 0) return null

      return createGroup({ combinator: parentCombinator, innerCombinator }, children)
    }
  }
}

const makeRoot = (innerCombinator: AdvancedInnerCombinator, children: AdvancedNode[]): AdvancedGroup => ({
  kind: "group",
  id: "advanced-root",
  combinator: "AND",
  innerCombinator,
  children,
})

const flattenRootGroup = (node: AdvancedNode | null): AdvancedGroup => {
  if (!node) return makeRoot("AND", [])
  if (node.kind === "group") return makeRoot(node.innerCombinator, node.children)

  // Preserve a sole condition's negation; a single NOT(leaf) must round-trip.
  return makeRoot("AND", [node])
}

export const toAdvanced = (ast: ParseNode): AdvancedState => {
  if (isIdentityAst(ast)) return { root: makeRoot("AND", []) }
  const advanced = childToAdvanced(ast, "AND")

  return { root: flattenRootGroup(advanced) }
}
