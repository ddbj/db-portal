import {
  TREE_NODES_ALT,
  USE_CASE_CARDS_ALT,
} from "@/lib/mock-data/submit-alt-tree"
import type {
  CardIdAlt,
  LeafNodeAlt,
  LeafNodeIdAlt,
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

// Q&A 候補連動の Tree ハイライト状態。
//   neutral    : Q&A 未回答 (Q1 または Q2 がまだ空)
//   active     : 候補 leaf に含まれる
//   folded     : 候補 leaf に含まれない (= Q&A 回答で除外されている)
export type LeafHighlightState = "active" | "folded" | "neutral"

export const resolveLeafHighlight = (
  leaf: LeafNodeAlt,
  candidateSet: ReadonlySet<LeafNodeIdAlt>,
  isQAStarted: boolean,
): LeafHighlightState => {
  if (!isQAStarted) return "neutral"
  if (candidateSet.has(leaf.id)) return "active"

  return "folded"
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

const collectDescendantLeafIds = (
  nodeId: TreeNodeIdAlt,
): readonly LeafNodeIdAlt[] => {
  const leaves: LeafNodeIdAlt[] = []
  const stack: TreeNodeIdAlt[] = [nodeId]
  const visited = new Set<TreeNodeIdAlt>()
  while (stack.length > 0) {
    const id = stack.pop()
    if (id === undefined || visited.has(id)) continue
    visited.add(id)
    const node = NODE_BY_ID_ALT.get(id)
    if (!node) continue
    if (node.type === "leaf") {
      leaves.push(node.id)
    } else {
      const children = CHILDREN_OF_ALT.get(id) ?? []
      for (const c of children) stack.push(c)
    }
  }

  return leaves
}

// question node のハイライトは子孫 leaf に候補がいるかで決まる。
export const resolveNodeHighlight = (
  nodeId: TreeNodeIdAlt,
  candidateSet: ReadonlySet<LeafNodeIdAlt>,
  isQAStarted: boolean,
): LeafHighlightState => {
  if (!isQAStarted) return "neutral"
  const node = NODE_BY_ID_ALT.get(nodeId)
  if (!node) return "neutral"
  if (node.type === "leaf") {
    return resolveLeafHighlight(node, candidateSet, isQAStarted)
  }
  const descendants = collectDescendantLeafIds(nodeId)
  const hasCandidate = descendants.some((id) => candidateSet.has(id))

  return hasCandidate ? "active" : "folded"
}

export const highlightedPathSetAlt = (
  nodeId: TreeNodeIdAlt | null,
): ReadonlySet<TreeNodeIdAlt> =>
  nodeId === null ? new Set() : new Set(pathFromRootAlt(nodeId))

export { CARD_BY_TREE_NODE_ID_ALT }
