import { describe, expect, it } from "vitest"

import { TREE_EDGES, TREE_NODES } from "@/lib/mock-data"
import {
  getLayoutedTree,
  NODE_HEIGHT,
  NODE_WIDTH,
} from "@/lib/submit/tree-layout"

describe("getLayoutedTree", () => {
  it("preserves node and edge count", () => {
    const { nodes, edges } = getLayoutedTree(TREE_NODES, TREE_EDGES)
    expect(nodes).toHaveLength(TREE_NODES.length)
    expect(edges).toHaveLength(TREE_EDGES.length)
  })

  it("every node has a finite position", () => {
    const { nodes } = getLayoutedTree(TREE_NODES, TREE_EDGES)
    for (const n of nodes) {
      expect(Number.isFinite(n.position.x)).toBe(true)
      expect(Number.isFinite(n.position.y)).toBe(true)
    }
  })

  it("every node preserves its id and type", () => {
    const { nodes } = getLayoutedTree(TREE_NODES, TREE_EDGES)
    const origById = new Map(TREE_NODES.map((n) => [n.id, n] as const))
    for (const n of nodes) {
      const orig = origById.get(n.id as typeof TREE_NODES[number]["id"])
      expect(orig).toBeDefined()
      expect(n.type).toBe(orig!.type)
    }
  })

  it("with rankdir=TB, every child has y >= parent y", () => {
    const { nodes } = getLayoutedTree(TREE_NODES, TREE_EDGES, { rankdir: "TB" })
    const yById = new Map(nodes.map((n) => [n.id, n.position.y] as const))
    for (const e of TREE_EDGES) {
      const ys = yById.get(e.source)!
      const yt = yById.get(e.target)!
      expect(yt).toBeGreaterThanOrEqual(ys)
    }
  })

  it("layout respects node-size constants", () => {
    expect(NODE_WIDTH).toBeGreaterThan(0)
    expect(NODE_HEIGHT).toBeGreaterThan(0)
  })

  it("edges are smoothstep type by default", () => {
    const { edges } = getLayoutedTree(TREE_NODES, TREE_EDGES)
    for (const e of edges) {
      expect(e.type).toBe("smoothstep")
    }
  })
})
