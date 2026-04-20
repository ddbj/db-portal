import type { TreeNodeId } from "@/types/submit"

import { TREE_NODES } from "./nodes"

export interface TreeEdge {
  id: string
  source: TreeNodeId
  target: TreeNodeId
}

const deriveEdges = (): readonly TreeEdge[] => {
  const edges: TreeEdge[] = []
  for (const node of TREE_NODES) {
    if (node.type !== "question") continue
    for (const opt of node.options) {
      edges.push({
        id: `${node.id}->${opt.childId}`,
        source: node.id,
        target: opt.childId,
      })
    }
  }

  return edges
}

// TREE_NODES の question node の options から自動導出した edges。
// 46 node / 45 edge（tree はサイクルなし、root 以外の全 node に親 1）。
export const TREE_EDGES: readonly TreeEdge[] = deriveEdges()
