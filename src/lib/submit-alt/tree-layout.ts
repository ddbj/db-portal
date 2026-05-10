import dagre from "@dagrejs/dagre"
import type { Edge, Node } from "@xyflow/react"

import type { TreeEdgeAlt } from "@/lib/mock-data/submit-alt-tree/edges"
import type { TreeNodeAlt } from "@/types/submit-alt"

export const NODE_WIDTH_ALT = 220
export const NODE_HEIGHT_ALT = 64

export interface LayoutOptionsAlt {
  rankdir?: "TB" | "LR"
  nodesep?: number
  ranksep?: number
  ranker?: "network-simplex" | "tight-tree" | "longest-path"
}

export interface LayoutedTreeAlt {
  nodes: Node[]
  edges: Edge[]
}

// dagre で多根森を階層レイアウト。submit 既存実装と同じだが TreeNodeAlt 型に合わせる。
export const getLayoutedTreeAlt = (
  nodes: readonly TreeNodeAlt[],
  edges: readonly TreeEdgeAlt[],
  opts: LayoutOptionsAlt = {},
): LayoutedTreeAlt => {
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({
    rankdir: opts.rankdir ?? "TB",
    nodesep: opts.nodesep ?? 28,
    ranksep: opts.ranksep ?? 80,
    ranker: opts.ranker ?? "tight-tree",
  })

  for (const n of nodes) {
    g.setNode(n.id, { width: NODE_WIDTH_ALT, height: NODE_HEIGHT_ALT })
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
      position: {
        x: pos.x - NODE_WIDTH_ALT / 2,
        y: pos.y - NODE_HEIGHT_ALT / 2,
      },
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
