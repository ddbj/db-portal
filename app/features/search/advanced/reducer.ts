import {
  type AdvancedCombinator,
  type AdvancedField,
  type AdvancedOp,
  isDateField,
} from "../types"

export type AdvancedNodeId = string

export type AdvancedCondition = {
  kind: "condition"
  id: AdvancedNodeId
  combinator: AdvancedCombinator
  field: AdvancedField
  op: AdvancedOp
  value: string
  from: string
  to: string
}

export type AdvancedInnerCombinator = "AND" | "OR"

export type AdvancedGroup = {
  kind: "group"
  id: AdvancedNodeId
  combinator: AdvancedCombinator
  innerCombinator: AdvancedInnerCombinator
  children: AdvancedNode[]
}

export type AdvancedNode = AdvancedCondition | AdvancedGroup

export type AdvancedState = {
  root: AdvancedGroup
}

export type AdvancedAction =
  | { type: "addCondition"; parentId: AdvancedNodeId; position?: number }
  | { type: "addGroup"; parentId: AdvancedNodeId; position?: number }
  | { type: "removeNode"; id: AdvancedNodeId }
  | { type: "updateCombinator"; id: AdvancedNodeId; combinator: AdvancedCombinator }
  | { type: "updateInnerCombinator"; id: AdvancedNodeId; innerCombinator: AdvancedInnerCombinator }
  | { type: "updateField"; id: AdvancedNodeId; field: AdvancedField }
  | { type: "updateOp"; id: AdvancedNodeId; op: AdvancedOp }
  | { type: "updateValue"; id: AdvancedNodeId; value: string }
  | { type: "updateRange"; id: AdvancedNodeId; from?: string; to?: string }
  | { type: "replaceRoot"; root: AdvancedGroup }
  | { type: "clear" }

let idCounter = 0
const idPrefix = `adv-${Date.now().toString(36)}-`

const fallbackId = (): AdvancedNodeId => {
  idCounter += 1

  return `${idPrefix}${idCounter.toString(36)}`
}

export const newId = (): AdvancedNodeId => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }

  return fallbackId()
}

const ROOT_ID: AdvancedNodeId = "advanced-root"

export const createCondition = (
  overrides: Partial<Omit<AdvancedCondition, "kind" | "id">> = {},
): AdvancedCondition => ({
  kind: "condition",
  id: newId(),
  combinator: "AND",
  field: "organism",
  op: "eq",
  value: "",
  from: "",
  to: "",
  ...overrides,
})

export const createGroup = (
  overrides: Partial<Omit<AdvancedGroup, "kind" | "id" | "children">> = {},
  children: AdvancedNode[] = [],
): AdvancedGroup => ({
  kind: "group",
  id: newId(),
  combinator: "AND",
  innerCombinator: "AND",
  ...overrides,
  children,
})

export const createInitialState = (): AdvancedState => ({
  root: {
    kind: "group",
    id: ROOT_ID,
    combinator: "AND",
    innerCombinator: "AND",
    children: [],
  },
})

const mapNode = (
  node: AdvancedNode,
  predicate: (n: AdvancedNode) => AdvancedNode | null,
): AdvancedNode | null => {
  const replaced = predicate(node)
  if (replaced !== node) return replaced
  if (node.kind === "condition") return node
  const nextChildren: AdvancedNode[] = []
  let changed = false
  for (const child of node.children) {
    const mapped = mapNode(child, predicate)
    if (mapped === null) {
      changed = true
      continue
    }
    if (mapped !== child) changed = true
    nextChildren.push(mapped)
  }
  if (!changed) return node

  return { ...node, children: nextChildren }
}

const mapGroup = (
  group: AdvancedGroup,
  predicate: (n: AdvancedNode) => AdvancedNode | null,
): AdvancedGroup => {
  const result = mapNode(group, predicate)
  if (result === null || result.kind !== "group") {
    throw new Error("advanced root must remain a group")
  }

  return result
}

const insertChild = (
  parent: AdvancedGroup,
  child: AdvancedNode,
  position?: number,
): AdvancedGroup => {
  const children = [...parent.children]
  const index = position === undefined ? children.length : Math.max(0, Math.min(position, children.length))
  children.splice(index, 0, child)

  return { ...parent, children }
}

const ensureFirstCombinatorAnd = (group: AdvancedGroup): AdvancedGroup => {
  if (group.children.length === 0) return group
  const first = group.children[0]
  if (first === undefined || first.combinator === "AND") return group
  const head: AdvancedNode = { ...first, combinator: "AND" }

  return { ...group, children: [head, ...group.children.slice(1)] }
}

export const advancedReducer = (state: AdvancedState, action: AdvancedAction): AdvancedState => {
  switch (action.type) {
    case "addCondition": {
      const root = mapGroup(state.root, (node) => {
        if (node.kind === "group" && node.id === action.parentId) {
          const condition = createCondition({ combinator: node.innerCombinator })

          return insertChild(node, condition, action.position)
        }

        return node
      })

      return { root: ensureFirstCombinatorAnd(root) }
    }
    case "addGroup": {
      const root = mapGroup(state.root, (node) => {
        if (node.kind === "group" && node.id === action.parentId) {
          const seed = createCondition({ combinator: "AND" })
          const group = createGroup(
            { combinator: node.innerCombinator, innerCombinator: "AND" },
            [seed],
          )

          return insertChild(node, group, action.position)
        }

        return node
      })

      return { root: ensureFirstCombinatorAnd(root) }
    }
    case "removeNode": {
      if (action.id === state.root.id) return state
      const root = mapGroup(state.root, (node) => (node.id === action.id ? null : node))

      return { root: ensureFirstCombinatorAnd(root) }
    }
    case "updateCombinator": {
      if (action.id === state.root.id) return state
      const root = mapGroup(state.root, (node) => {
        if (node.id === action.id) {
          if (node.kind === "condition") return { ...node, combinator: action.combinator }

          return { ...node, combinator: action.combinator }
        }

        return node
      })

      return { root: ensureFirstCombinatorAnd(root) }
    }
    case "updateInnerCombinator": {
      const root = mapGroup(state.root, (node) => {
        if (node.kind === "group" && node.id === action.id) {
          return { ...node, innerCombinator: action.innerCombinator }
        }

        return node
      })

      return { root }
    }
    case "updateField": {
      const root = mapGroup(state.root, (node) => {
        if (node.kind === "condition" && node.id === action.id) {
          const nextField = action.field
          const nextOp: AdvancedOp = isDateField(nextField)
            ? "between"
            : node.op === "between" ? "eq" : node.op

          return { ...node, field: nextField, op: nextOp }
        }

        return node
      })

      return { root }
    }
    case "updateOp": {
      const root = mapGroup(state.root, (node) => {
        if (node.kind === "condition" && node.id === action.id) {
          return { ...node, op: action.op }
        }

        return node
      })

      return { root }
    }
    case "updateValue": {
      const root = mapGroup(state.root, (node) => {
        if (node.kind === "condition" && node.id === action.id) {
          return { ...node, value: action.value }
        }

        return node
      })

      return { root }
    }
    case "updateRange": {
      const root = mapGroup(state.root, (node) => {
        if (node.kind === "condition" && node.id === action.id) {
          return {
            ...node,
            from: action.from ?? node.from,
            to: action.to ?? node.to,
          }
        }

        return node
      })

      return { root }
    }
    case "replaceRoot": {
      return { root: ensureFirstCombinatorAnd(action.root) }
    }
    case "clear":
      return createInitialState()
  }
}
