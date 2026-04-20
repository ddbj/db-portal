import dagre from "@dagrejs/dagre"
import type { Edge, Node } from "@xyflow/react"

import type { TreeEdge } from "@/lib/mock-data/submit-tree"
import type { TreeNode } from "@/types/submit"

export const NODE_WIDTH = 220
export const NODE_HEIGHT = 64

export interface LayoutOptions {
  rankdir?: "TB" | "LR"
  nodesep?: number
  ranksep?: number
  ranker?: "network-simplex" | "tight-tree" | "longest-path"
}

export interface LayoutedTree {
  nodes: Node[]
  edges: Edge[]
}

// dagre で階層レイアウトを計算し、@xyflow/react の Node/Edge 形式で返す。
// pure function。SSR ↔ hydration で同じ結果を返すよう deps に依存しない。
export const getLayoutedTree = (
  nodes: readonly TreeNode[],
  edges: readonly TreeEdge[],
  opts: LayoutOptions = {},
): LayoutedTree => {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: opts.rankdir ?? "TB",
    nodesep: opts.nodesep ?? 28,
    ranksep: opts.ranksep ?? 80,
    ranker: opts.ranker ?? "tight-tree",
  })

  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT })
  }
  for (const e of edges) {
    g.setEdge(e.source, e.target)
  }

  dagre.layout(g)

  const laidNodes: Node[] = nodes.map((n) => {
    const pos = g.node(n.id)

    return {
      id: n.id,
      type: n.type,
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 },
      data: { ...n } as unknown as Record<string, unknown>,
      draggable: false,
      connectable: false,
      selectable: true,
    }
  })

  const laidEdges: Edge[] = edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "smoothstep",
    animated: false,
  }))

  return { nodes: laidNodes, edges: laidEdges }
}
