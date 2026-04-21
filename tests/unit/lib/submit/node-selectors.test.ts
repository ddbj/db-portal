import { describe, expect, it } from "vitest"

import { TREE_NODES, USE_CASE_CARDS } from "@/lib/mock-data"
import {
  highlightedPathSet,
  parentCardIdOf,
  pathFromRoot,
  resolveActiveCard,
  resolveDetailMode,
} from "@/lib/submit/node-selectors"

describe("pathFromRoot", () => {
  it("returns [root] for root", () => {
    expect(pathFromRoot("root")).toEqual(["root"])
  })

  it("starts at root and ends at the target node", () => {
    const path = pathFromRoot("prokaryote-raw-assembly")
    expect(path[0]).toBe("root")
    expect(path[path.length - 1]).toBe("prokaryote-raw-assembly")
  })

  it("covers a deep eukaryote path", () => {
    expect(pathFromRoot("eukaryote-raw-assembly")).toEqual([
      "root",
      "modality",
      "sequence-scale",
      "sequence-source",
      "single-organism",
      "eukaryote",
      "eukaryote-genome",
      "eukaryote-raw-assembly",
    ])
  })
})

describe("resolveActiveCard", () => {
  it("returns the card for a card tree node", () => {
    expect(resolveActiveCard("microbial")).toBe("microbial")
    expect(resolveActiveCard("eukaryote")).toBe("eukaryote")
    expect(resolveActiveCard("metagenome")).toBe("metagenome")
  })

  it("returns the parent card for a descendant leaf", () => {
    expect(resolveActiveCard("prokaryote-raw-assembly")).toBe("microbial")
    expect(resolveActiveCard("eukaryote-est-small")).toBe("eukaryote")
    expect(resolveActiveCard("metagenome-genome-bin")).toBe("metagenome")
    expect(resolveActiveCard("human-restricted")).toBe("human-restricted")
    expect(resolveActiveCard("proteomics")).toBe("proteomics")
  })

  it("covers every leaf (no leaf returns null)", () => {
    const leaves = TREE_NODES.filter((n) => n.type === "leaf")
    for (const leaf of leaves) {
      expect(resolveActiveCard(leaf.id)).not.toBeNull()
    }
  })

  it("every card's treeNodeId maps back to the same card", () => {
    for (const card of USE_CASE_CARDS) {
      expect(resolveActiveCard(card.treeNodeId)).toBe(card.id)
    }
  })

  it("returns null when nodeId is null (unselected state)", () => {
    expect(resolveActiveCard(null)).toBeNull()
  })
})

describe("resolveDetailMode", () => {
  it("is 'leaf' for leaves", () => {
    expect(resolveDetailMode("prokaryote-raw-assembly")).toBe("leaf")
    expect(resolveDetailMode("eukaryote-tpa")).toBe("leaf")
    expect(resolveDetailMode("proteomics")).toBe("leaf")
  })

  it("is 'overview' for intermediate question nodes", () => {
    expect(resolveDetailMode("microbial")).toBe("overview")
    expect(resolveDetailMode("root")).toBe("overview")
    expect(resolveDetailMode("eukaryote-genome")).toBe("overview")
  })
})

describe("parentCardIdOf", () => {
  it("behaves identically to resolveActiveCard for every node", () => {
    for (const n of TREE_NODES) {
      expect(parentCardIdOf(n.id)).toBe(resolveActiveCard(n.id))
    }
  })

  it("returns null when nodeId is null", () => {
    expect(parentCardIdOf(null)).toBeNull()
  })
})

describe("highlightedPathSet", () => {
  it("includes root for any descendant", () => {
    const set = highlightedPathSet("eukaryote-raw-assembly")
    expect(set.has("root")).toBe(true)
    expect(set.has("eukaryote-raw-assembly")).toBe(true)
    expect(set.has("eukaryote")).toBe(true)
    expect(set.has("eukaryote-genome")).toBe(true)
  })

  it("singleton for root", () => {
    const set = highlightedPathSet("root")
    expect(set.size).toBe(1)
    expect(set.has("root")).toBe(true)
  })

  it("returns an empty Set when nodeId is null (unselected state)", () => {
    const set = highlightedPathSet(null)
    expect(set.size).toBe(0)
  })
})
