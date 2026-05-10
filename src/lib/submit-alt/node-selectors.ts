import {
  TREE_NODES_ALT,
  USE_CASE_CARDS_ALT,
} from "@/lib/mock-data/submit-alt-tree"
import type {
  CardIdAlt,
  DataTypeId,
  LeafNodeAlt,
  TreeNodeAlt,
  TreeNodeIdAlt,
} from "@/types/submit-alt"

export const NODE_BY_ID_ALT: ReadonlyMap<TreeNodeIdAlt, TreeNodeAlt> = new Map(
  TREE_NODES_ALT.map((n) => [n.id, n] as const),
)

const ALL_NODE_IDS_ALT: ReadonlySet<TreeNodeIdAlt> = new Set(
  TREE_NODES_ALT.map((n) => n.id),
)

export const isValidNodeIdAlt = (v: string): v is TreeNodeIdAlt =>
  ALL_NODE_IDS_ALT.has(v as TreeNodeIdAlt)

const CARD_BY_TREE_NODE_ID_ALT: ReadonlyMap<TreeNodeIdAlt, CardIdAlt> = new Map(
  USE_CASE_CARDS_ALT.map((c) => [c.treeNodeId as TreeNodeIdAlt, c.id] as const),
)

// nodeId から root までの経路を root 起点の順序で返す。
export const pathFromRootAlt = (
  nodeId: TreeNodeIdAlt,
): readonly TreeNodeIdAlt[] => {
  const reversed: TreeNodeIdAlt[] = []
  let current: TreeNodeIdAlt | null = nodeId
  const visited = new Set<TreeNodeIdAlt>()
  while (current !== null) {
    if (visited.has(current)) break
    visited.add(current)
    reversed.push(current)
    const node = NODE_BY_ID_ALT.get(current)
    if (!node) break
    current = node.parentId
  }

  return reversed.slice().reverse()
}

// nodeId が属する Use Case Card を返す。
export const resolveActiveCardAlt = (
  nodeId: TreeNodeIdAlt | null,
): CardIdAlt | null => {
  if (nodeId === null) return null
  const path = pathFromRootAlt(nodeId)
  for (let i = path.length - 1; i >= 0; i--) {
    const id = path[i]
    if (id === undefined) continue
    const cardId = CARD_BY_TREE_NODE_ID_ALT.get(id)
    if (cardId !== undefined) return cardId
  }

  return null
}

export type DetailModeAlt = "overview" | "leaf"

export const resolveDetailModeAlt = (nodeId: TreeNodeIdAlt): DetailModeAlt => {
  const node = NODE_BY_ID_ALT.get(nodeId)

  return node?.type === "leaf" ? "leaf" : "overview"
}

// types= 連動の絞り込み状態。
//   neutral    : types= 空。leaf は選択以前の通常表示
//   active     : types= に該当
//   emphasized : 複数 type 該当（Raw + Asm 系の強調）
//   folded     : 該当しない / human=1 で非ヒト leaf
export type LeafHighlightState = "active" | "folded" | "neutral" | "emphasized"

export const resolveLeafHighlight = (
  leaf: LeafNodeAlt,
  types: ReadonlySet<DataTypeId>,
  human: boolean,
): LeafHighlightState => {
  if (human && leaf.humanAffinity === "always-nonhuman") return "folded"

  if (types.size === 0) return "neutral"

  const matched = leaf.dataTypes.filter((dt) => types.has(dt))
  if (matched.length === 0) return "folded"

  if (types.size >= 2 && matched.length >= 2) return "emphasized"

  return "active"
}

const CHILDREN_OF_ALT: ReadonlyMap<TreeNodeIdAlt, readonly TreeNodeIdAlt[]> =
  ((): ReadonlyMap<TreeNodeIdAlt, readonly TreeNodeIdAlt[]> => {
    const map = new Map<TreeNodeIdAlt, TreeNodeIdAlt[]>()
    for (const node of TREE_NODES_ALT) {
      if (node.parentId === null) continue
      const arr = map.get(node.parentId) ?? []
      arr.push(node.id)
      map.set(node.parentId, arr)
    }

    return map
  })()

const collectDescendantLeafStates = (
  nodeId: TreeNodeIdAlt,
  types: ReadonlySet<DataTypeId>,
  human: boolean,
): Set<LeafHighlightState> => {
  const states = new Set<LeafHighlightState>()
  const stack: TreeNodeIdAlt[] = [nodeId]
  const visited = new Set<TreeNodeIdAlt>()
  while (stack.length > 0) {
    const id = stack.pop()
    if (id === undefined || visited.has(id)) continue
    visited.add(id)
    const node = NODE_BY_ID_ALT.get(id)
    if (!node) continue
    if (node.type === "leaf") {
      states.add(resolveLeafHighlight(node, types, human))
    } else {
      const children = CHILDREN_OF_ALT.get(id) ?? []
      for (const c of children) stack.push(c)
    }
  }

  return states
}

// question node のハイライトは子孫 leaf の状態を集約する。
export const resolveNodeHighlight = (
  nodeId: TreeNodeIdAlt,
  types: ReadonlySet<DataTypeId>,
  human: boolean,
): LeafHighlightState => {
  const node = NODE_BY_ID_ALT.get(nodeId)
  if (!node) return "neutral"
  if (node.type === "leaf") return resolveLeafHighlight(node, types, human)

  const states = collectDescendantLeafStates(nodeId, types, human)
  if (states.size === 0) return "neutral"
  if (states.has("emphasized")) return "emphasized"
  if (states.has("active")) return "active"
  if (states.has("neutral")) return "neutral"

  return "folded"
}

export const highlightedPathSetAlt = (
  nodeId: TreeNodeIdAlt | null,
): ReadonlySet<TreeNodeIdAlt> =>
  nodeId === null ? new Set() : new Set(pathFromRootAlt(nodeId))

export { CARD_BY_TREE_NODE_ID_ALT }
