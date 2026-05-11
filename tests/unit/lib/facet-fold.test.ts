import { describe, expect, it } from "vitest"

import { foldFacetBuckets } from "@/lib/facet-fold"

describe("foldFacetBuckets", () => {
  it("空配列なら空配列", () => {
    expect(foldFacetBuckets([])).toEqual([])
  })

  it("case-insensitive で grouping、最頻 key を displayKey に", () => {
    const folded = foldFacetBuckets([
      { key: "Genome sequencing", doc_count: 100 },
      { key: "genome sequencing", doc_count: 30 },
      { key: "Genome Sequencing", doc_count: 10 },
    ])
    expect(folded).toHaveLength(1)
    const top = folded[0]
    expect(top).toBeDefined()
    if (top === undefined) return
    expect(top.displayKey).toBe("Genome sequencing")
    expect(top.doc_count).toBe(140)
    expect([...top.aliases].sort()).toEqual(
      ["Genome Sequencing", "Genome sequencing", "genome sequencing"].sort(),
    )
  })

  it("異なる key (異なる lowercase) は別 group", () => {
    const folded = foldFacetBuckets([
      { key: "Homo sapiens", doc_count: 100 },
      { key: "Mus musculus", doc_count: 50 },
    ])
    expect(folded).toHaveLength(2)
    expect(folded.map((f) => f.displayKey).sort()).toEqual(
      ["Homo sapiens", "Mus musculus"].sort(),
    )
  })

  it("doc_count 同点なら最初の bucket が displayKey", () => {
    const folded = foldFacetBuckets([
      { key: "ABC", doc_count: 10 },
      { key: "abc", doc_count: 10 },
    ])
    expect(folded).toHaveLength(1)
    const top = folded[0]
    expect(top).toBeDefined()
    if (top === undefined) return
    expect(top.displayKey).toBe("ABC")
    expect(top.doc_count).toBe(20)
  })

  it("suffix 違い (例: 'Oxford Nanopore' vs 'Oxford Nanopore Technologies') は別 group", () => {
    const folded = foldFacetBuckets([
      { key: "Oxford Nanopore", doc_count: 50 },
      { key: "Oxford Nanopore Technologies", doc_count: 30 },
    ])
    expect(folded).toHaveLength(2)
  })
})
