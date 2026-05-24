import type { ParseNode } from "~/lib/api"

import { canonicalizeAst } from "../ast/canonicalize"
import { identityAst } from "../ast/identity"
import type { AdvancedCondition, AdvancedGroup, AdvancedNode, AdvancedState } from "./reducer"

const conditionToLeaf = (condition: AdvancedCondition): ParseNode | null => {
  if (condition.op === "between") {
    if (condition.from === "" || condition.to === "") return null

    return { op: "between", field: condition.field, from: condition.from, to: condition.to }
  }
  if (condition.value === "") return null

  return { op: condition.op, field: condition.field, value: condition.value }
}

const groupChildrenToAst = (
  combinator: "AND" | "OR",
  children: ParseNode[],
): ParseNode => {
  if (children.length === 0) return identityAst
  const [head] = children
  if (children.length === 1) return head ?? identityAst

  return { op: combinator, rules: children }
}

const wrapCombinator = (combinator: "AND" | "OR" | "NOT", node: ParseNode): ParseNode => {
  if (combinator === "NOT") return { op: "NOT", rules: [node] }

  return node
}

const nodeToAst = (node: AdvancedNode): ParseNode | null => {
  if (node.kind === "condition") return conditionToLeaf(node)
  const innerNodes: ParseNode[] = []
  for (const child of node.children) {
    const inner = nodeToAst(child)
    if (inner === null) continue
    innerNodes.push(wrapCombinator(child.combinator === "NOT" ? "NOT" : "AND", inner))
  }
  if (innerNodes.length === 0) return null

  return groupChildrenToAst(node.innerCombinator, innerNodes)
}

const collectRootChildren = (root: AdvancedGroup): ParseNode[] => {
  const innerNodes: ParseNode[] = []
  for (const child of root.children) {
    const inner = nodeToAst(child)
    if (inner === null) continue
    innerNodes.push(wrapCombinator(child.combinator === "NOT" ? "NOT" : "AND", inner))
  }

  return innerNodes
}

export const fromAdvanced = (state: AdvancedState): ParseNode => {
  const innerNodes = collectRootChildren(state.root)
  const combined = groupChildrenToAst(state.root.innerCombinator, innerNodes)

  return canonicalizeAst(combined)
}
