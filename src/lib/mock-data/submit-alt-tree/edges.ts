import type { TreeNodeIdAlt } from "@/types/submit-alt"

import { TREE_NODES_ALT } from "./nodes"

export interface TreeEdgeAlt {
  id: string
  source: TreeNodeIdAlt
  target: TreeNodeIdAlt
}

const deriveEdges = (): readonly TreeEdgeAlt[] => {
  const edges: TreeEdgeAlt[] = []
  for (const node of TREE_NODES_ALT) {
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

// TREE_NODES_ALT の question node options から自動導出。
// 多根森（5 起点 + 5 単独 leaf 起点 + 5 中間 node + 33 leaf - 5 単独 leaf 重複 = 43 node）。
export const TREE_EDGES_ALT: readonly TreeEdgeAlt[] = deriveEdges()
