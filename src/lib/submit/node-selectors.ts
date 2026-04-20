import { TREE_NODES, USE_CASE_CARDS } from "@/lib/mock-data"
import type { CardId, TreeNode, TreeNodeId } from "@/types/submit"

const NODE_BY_ID: ReadonlyMap<TreeNodeId, TreeNode> = new Map(
  TREE_NODES.map((n) => [n.id, n] as const),
)

const CARD_BY_TREE_NODE_ID: ReadonlyMap<TreeNodeId, CardId> = new Map(
  USE_CASE_CARDS.map((c) => [c.treeNodeId, c.id] as const),
)

// nodeId から root までの経路を root 起点の順序で返す。
// 例: pathFromRoot("prokaryote-raw-assembly")
//   → ["root", "modality", "sequence-scale", "sequence-source", "single-organism", "microbial", "prokaryote", "prokaryote-raw-assembly"]
export const pathFromRoot = (nodeId: TreeNodeId): readonly TreeNodeId[] => {
  const reversed: TreeNodeId[] = []
  let current: TreeNodeId | null = nodeId
  const visited = new Set<TreeNodeId>()
  while (current !== null) {
    if (visited.has(current)) break
    visited.add(current)
    reversed.push(current)
    const node = NODE_BY_ID.get(current)
    if (!node) break
    if (node.type === "question" && node.parentId === null) break
    current = node.parentId
  }

  return reversed.slice().reverse()
}

// nodeId が属するユースケースカードを返す。
// 自身がカード対応 node ならそれ、そうでなければ祖先を辿って最初に見つかるカード。
export const resolveActiveCard = (nodeId: TreeNodeId): CardId | null => {
  const path = pathFromRoot(nodeId)
  for (let i = path.length - 1; i >= 0; i--) {
    const id = path[i]
    if (id === undefined) continue
    const cardId = CARD_BY_TREE_NODE_ID.get(id)
    if (cardId !== undefined) return cardId
  }

  return null
}

export type DetailMode = "overview" | "leaf"

// leaf なら "leaf"、中間 node なら "overview"。
export const resolveDetailMode = (nodeId: TreeNodeId): DetailMode => {
  const node = NODE_BY_ID.get(nodeId)

  return node?.type === "leaf" ? "leaf" : "overview"
}

// 「準備中」placeholder の戻りリンク先カード。
export const parentCardIdOf = (nodeId: TreeNodeId): CardId | null => {
  return resolveActiveCard(nodeId)
}

// 経路ハイライト用の Set。
export const highlightedPathSet = (
  nodeId: TreeNodeId,
): ReadonlySet<TreeNodeId> => new Set(pathFromRoot(nodeId))

export { CARD_BY_TREE_NODE_ID, NODE_BY_ID }
