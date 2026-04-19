import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import {
  LEAF_GOALS,
  LEAF_NUMBER,
  LEAF_PARENTS,
  TREE_NODES,
} from "@/lib/mock-data/submit-tree"
import type {
  LeafNode,
  LeafNodeId,
  QuestionNode,
  TreeNodeId,
} from "@/types/submit"

const leaves = TREE_NODES.filter((n): n is LeafNode => n.type === "leaf")
const questions = TREE_NODES.filter((n): n is QuestionNode => n.type === "question")
const nodeById = new Map<TreeNodeId, typeof TREE_NODES[number]>(
  TREE_NODES.map((n) => [n.id, n] as const),
)

describe("TREE_NODES structure (mock-data)", () => {

  it("has exactly 31 leaves", () => {
    expect(leaves).toHaveLength(31)
  })

  it("has 15 question nodes", () => {
    expect(questions).toHaveLength(15)
  })

  it("has unique node ids (no duplicates)", () => {
    const ids = TREE_NODES.map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("LEAF_GOALS covers exactly the 31 leaves", () => {
    const leafIds = leaves.map((l) => l.id).slice().sort()
    const goalKeys = (Object.keys(LEAF_GOALS) as LeafNodeId[]).slice().sort()
    expect(goalKeys).toEqual(leafIds)
  })

  it("LEAF_NUMBER bijects 1..31 with leaf ids", () => {
    const numbers = (Object.keys(LEAF_NUMBER) as LeafNodeId[])
      .map((id) => LEAF_NUMBER[id])
      .slice()
      .sort((a, b) => a - b)
    expect(numbers).toEqual(Array.from({ length: 31 }, (_, i) => i + 1))
  })

  it("every leaf parentId references an existing question node", () => {
    for (const leaf of leaves) {
      const parent = nodeById.get(leaf.parentId)
      expect(parent, `leaf ${leaf.id} parent ${leaf.parentId} should exist`).toBeDefined()
      expect(parent?.type).toBe("question")
    }
  })

  it("every question childId references an existing node", () => {
    for (const q of questions) {
      for (const opt of q.options) {
        const child = nodeById.get(opt.childId)
        expect(child, `question ${q.id} option child ${opt.childId} should exist`).toBeDefined()
      }
    }
  })

  it("LEAF_PARENTS matches each leaf node parentId", () => {
    for (const leaf of leaves) {
      expect(LEAF_PARENTS[leaf.id]).toBe(leaf.parentId)
    }
  })

  it("root question has parentId null and all other questions have a parent", () => {
    const root = questions.find((q) => q.id === "root")
    expect(root?.parentId).toBeNull()
    for (const q of questions.filter((x) => x.id !== "root")) {
      expect(q.parentId).not.toBeNull()
    }
  })

  it("PBT: every leaf is reachable from root via parentId chain (≤ 7 hops)", () => {
    expect(() => fc.assert(
      fc.property(
        fc.constantFrom(...leaves.map((l) => l.id)),
        (leafId) => {
          let current: TreeNodeId = leafId
          let hops = 0
          const visited = new Set<TreeNodeId>()
          while (hops <= 8) {
            if (visited.has(current)) return false
            visited.add(current)
            const node = nodeById.get(current)
            if (!node) return false
            if (node.type === "question" && node.parentId === null) {
              return current === "root"
            }
            const parent = node.type === "leaf" ? node.parentId : node.parentId
            if (parent === null) return false
            current = parent
            hops += 1
          }

          return false
        },
      ),
      { numRuns: 100 },
    )).not.toThrow()
  })

  it("PBT: tree DFS from root reaches every node and never revisits", () => {
    const visited = new Set<TreeNodeId>()
    const dfs = (id: TreeNodeId, depth: number): boolean => {
      if (depth > 10) return false
      if (visited.has(id)) return false
      visited.add(id)
      const node = nodeById.get(id)
      if (!node) return false
      if (node.type === "leaf") return true
      for (const opt of node.options) {
        if (!dfs(opt.childId, depth + 1)) return false
      }

      return true
    }
    expect(dfs("root", 0)).toBe(true)
    expect(visited.size).toBe(TREE_NODES.length)
  })
})
