import { describe, expect, test } from "vitest"

import {
  createInitialSearchFacetState,
  type FilterRow,
  fromSidebar,
  SCOPE_FILTERS,
  type SearchFacetState,
} from "~/features/search"
import type { ParseNode } from "~/lib/api"

// Facet aggregation runs on the keyword field (.keyword), so bucket values are
// exact. Re-injecting a selected bucket into the sidebar filter is asymmetric:
// an enum field re-injects as `eq` (exact term match), but a text field
// re-injects as `contains` (analyzed match_phrase, may widen the result set).
// vendor (jga) and kingdom (taxonomy) are facet rows backed by text fields, so
// they carry op="contains"; objectType (bioproject) is enum, so op="eq".
// Contract source: docs/search-fields.md § DSL field type 規約.

type LeafNode = { op: string; field: string; value: string }
type OrNode = { op: "OR"; rules: ParseNode[] }

const expectLeaf = (node: ParseNode): LeafNode => {
  if (node.op !== "eq" && node.op !== "contains") {
    throw new Error(`expected eq/contains leaf, got ${node.op}`)
  }

  return node as LeafNode
}

const expectOr = (node: ParseNode): OrNode => {
  if (node.op !== "OR") throw new Error(`expected OR, got ${node.op}`)

  return node as OrNode
}

const withFacet = (key: string, values: string[]): SearchFacetState => ({
  ...createInitialSearchFacetState(),
  facets: { [key]: values },
})

const facetRow = (scope: keyof typeof SCOPE_FILTERS, key: string): FilterRow => {
  const row = SCOPE_FILTERS[scope].find((r) => r.key === key)
  if (!row) throw new Error(`no row ${key} in scope ${scope}`)

  return row
}

describe("facet bucket re-injection op asymmetry", () => {
  test("jgaVendorFacet_singleValue_emitsContainsLeaf", () => {
    const leaf = expectLeaf(fromSidebar(withFacet("vendor", ["Illumina"]), { db: "jga" }))
    expect(leaf.op).toBe("contains")
    expect(leaf.field).toBe("vendor")
    expect(leaf.value).toBe("Illumina")
  })

  test("bioprojectObjectTypeFacet_singleValue_emitsEqLeaf", () => {
    const leaf = expectLeaf(
      fromSidebar(withFacet("objectType", ["BioProject"]), { db: "bioproject" }),
    )
    expect(leaf.op).toBe("eq")
    expect(leaf.field).toBe("object_type")
    expect(leaf.value).toBe("BioProject")
  })

  test("taxonomyKingdomFacet_singleValue_emitsContainsLeaf", () => {
    const leaf = expectLeaf(fromSidebar(withFacet("kingdom", ["Bacteria"]), { db: "taxonomy" }))
    expect(leaf.op).toBe("contains")
    expect(leaf.field).toBe("kingdom")
    expect(leaf.value).toBe("Bacteria")
  })

  test("jgaVendorFacet_multiValue_emitsOrOfContains", () => {
    const or = expectOr(fromSidebar(withFacet("vendor", ["Illumina", "PacBio"]), { db: "jga" }))
    expect(or.rules.length).toBe(2)
    for (const rule of or.rules) {
      expect(expectLeaf(rule).op).toBe("contains")
      expect(expectLeaf(rule).field).toBe("vendor")
    }
  })

  test("bioprojectObjectTypeFacet_multiValue_emitsOrOfEq", () => {
    const or = expectOr(
      fromSidebar(withFacet("objectType", ["BioProject", "BioSample"]), { db: "bioproject" }),
    )
    expect(or.rules.length).toBe(2)
    for (const rule of or.rules) {
      expect(expectLeaf(rule).op).toBe("eq")
      expect(expectLeaf(rule).field).toBe("object_type")
    }
  })

  test("taxonomyKingdomFacet_multiValue_emitsOrOfContains", () => {
    const or = expectOr(
      fromSidebar(withFacet("kingdom", ["Bacteria", "Archaea"]), { db: "taxonomy" }),
    )
    expect(or.rules.length).toBe(2)
    for (const rule of or.rules) {
      expect(expectLeaf(rule).op).toBe("contains")
    }
  })

  // The emitted AST op is governed by the facet row's declared op, not the row
  // kind. text-backed facets and enum facets share kind "facet" but diverge here.
  test("vendorAndObjectTypeAndKingdom_areAllFacetRows", () => {
    expect(facetRow("jga", "vendor").kind).toBe("facet")
    expect(facetRow("bioproject", "objectType").kind).toBe("facet")
    expect(facetRow("taxonomy", "kingdom").kind).toBe("facet")
  })

  test("textBackedFacetRows_declareContainsOp", () => {
    expect(facetRow("jga", "vendor").op).toBe("contains")
    expect(facetRow("taxonomy", "kingdom").op).toBe("contains")
  })

  test("enumFacetRow_declaresEqOp", () => {
    expect(facetRow("bioproject", "objectType").op).toBe("eq")
  })

  // Every facet row re-injects with a leaf operator (eq or contains); a facet
  // declared with `between` would silently break re-injection, so guard it.
  test("everyFacetRow_declaresLeafOp", () => {
    for (const rows of Object.values(SCOPE_FILTERS)) {
      for (const row of rows) {
        if (row.kind !== "facet") continue
        expect(["eq", "contains"]).toContain(row.op)
      }
    }
  })
})
