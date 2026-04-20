import type { AdvancedCondition, LogicOperator } from "@/types/search"

import type {
  AdvancedConditionNode,
  AdvancedGroupNode,
  AdvancedNodeWithId,
} from "./types"

export const ROOT_ID = "root"

export const createNodeId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return `n-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`
}

export const createEmptyRoot = (): AdvancedGroupNode => ({
  id: ROOT_ID,
  kind: "group",
  logic: "AND",
  children: [],
})

export const createConditionNode = (
  condition: AdvancedCondition,
): AdvancedConditionNode => ({
  id: createNodeId(),
  kind: "condition",
  condition,
})

export const createGroupNode = (
  logic: LogicOperator = "AND",
): AdvancedGroupNode => ({
  id: createNodeId(),
  kind: "group",
  logic,
  children: [],
})

export const getNodeAt = (
  root: AdvancedGroupNode,
  path: readonly number[],
): AdvancedNodeWithId | undefined => {
  let current: AdvancedNodeWithId = root
  for (const idx of path) {
    if (current.kind !== "group") return undefined
    const child: AdvancedNodeWithId | undefined = current.children[idx]
    if (child === undefined) return undefined
    current = child
  }

  return current
}

const replaceNodeAt = (
  root: AdvancedGroupNode,
  path: readonly number[],
  replacer: (n: AdvancedNodeWithId) => AdvancedNodeWithId,
): AdvancedGroupNode => {
  if (path.length === 0) {
    const replaced = replacer(root)
    if (replaced.kind !== "group") {
      throw new Error("ROOT must remain a group node")
    }

    return replaced
  }
  const [head, ...rest] = path
  if (head === undefined) return root
  const child = root.children[head]
  if (child === undefined) return root
  const nextChild = rest.length === 0
    ? replacer(child)
    : child.kind === "group"
      ? replaceNodeAt(child, rest, replacer)
      : child
  const nextChildren = root.children.slice()
  nextChildren[head] = nextChild

  return { ...root, children: nextChildren }
}

export const addConditionAt = (
  root: AdvancedGroupNode,
  groupPath: readonly number[],
  condition: AdvancedCondition,
): AdvancedGroupNode =>
  replaceNodeAt(root, groupPath, (n) => {
    if (n.kind !== "group") return n

    return { ...n, children: [...n.children, createConditionNode(condition)] }
  })

export const addGroupAt = (
  root: AdvancedGroupNode,
  groupPath: readonly number[],
  logic: LogicOperator = "AND",
): AdvancedGroupNode =>
  replaceNodeAt(root, groupPath, (n) => {
    if (n.kind !== "group") return n

    return { ...n, children: [...n.children, createGroupNode(logic)] }
  })

export const removeAt = (
  root: AdvancedGroupNode,
  path: readonly number[],
): AdvancedGroupNode => {
  if (path.length === 0) return root
  const parentPath = path.slice(0, -1)
  const lastIdx = path[path.length - 1]
  if (lastIdx === undefined) return root

  return replaceNodeAt(root, parentPath, (n) => {
    if (n.kind !== "group") return n
    const nextChildren = n.children.filter((_, i) => i !== lastIdx)

    return { ...n, children: nextChildren }
  })
}

export const updateConditionAt = (
  root: AdvancedGroupNode,
  path: readonly number[],
  patch: Partial<AdvancedCondition>,
): AdvancedGroupNode =>
  replaceNodeAt(root, path, (n) => {
    if (n.kind !== "condition") return n

    return { ...n, condition: { ...n.condition, ...patch } }
  })

export const setGroupLogicAt = (
  root: AdvancedGroupNode,
  path: readonly number[],
  logic: LogicOperator,
): AdvancedGroupNode =>
  replaceNodeAt(root, path, (n) => {
    if (n.kind !== "group") return n

    return { ...n, logic }
  })

export interface VisitEntry {
  node: AdvancedNodeWithId
  path: readonly number[]
}

export const walkTree = (root: AdvancedGroupNode): VisitEntry[] => {
  const entries: VisitEntry[] = []
  const visit = (node: AdvancedNodeWithId, path: readonly number[]): void => {
    entries.push({ node, path })
    if (node.kind === "group") {
      node.children.forEach((c, i) => visit(c, [...path, i]))
    }
  }
  visit(root, [])

  return entries
}

export const collectConditionFieldIds = (
  root: AdvancedGroupNode,
): readonly { id: string; fieldId: string; path: readonly number[] }[] =>
  walkTree(root)
    .filter((e) => e.node.kind === "condition")
    .map((e) => {
      const n = e.node as AdvancedConditionNode

      return { id: n.id, fieldId: n.condition.field, path: e.path }
    })
