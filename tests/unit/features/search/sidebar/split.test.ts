import { describe, expect, test } from "vitest"

import {
  createInitialSearchFacetState,
  fromSidebar,
  isIdentityAst,
  presetRangeToDates,
  type SearchFacetState,
  splitForSidebar,
} from "~/features/search"
import type { ParseNode } from "~/lib/api"

const organismLeaf = (value: string): ParseNode => ({ op: "eq", field: "organism_id", value })

const organismNameLeaf = (value: string): ParseNode => ({ op: "contains", field: "organism_name", value })

const FIXED_NOW = new Date("2024-06-15T00:00:00Z")

const presetBetween = (key: "1y" | "5y" | "10y"): ParseNode => {
  const range = presetRangeToDates(key, FIXED_NOW)
  if (range === null) throw new Error(`no range for ${key}`)

  return { op: "between", field: "date_published", from: range.from, to: range.to }
}

describe("splitForSidebar", () => {
  test("extractsOrganismFacet", () => {
    const { sidebar, rest } = splitForSidebar(organismLeaf("9606"))
    expect(sidebar.facets.organism).toEqual(["9606"])
    expect(isIdentityAst(rest)).toBe(true)
  })

  test("extractsOrOfOrganisms", () => {
    const ast: ParseNode = { op: "OR", rules: [organismLeaf("9606"), organismLeaf("10090")] }
    const { sidebar } = splitForSidebar(ast)
    expect(sidebar.facets.organism).toEqual(["9606", "10090"])
  })

  test("extractsOrganismNameAsTextInCross", () => {
    const { sidebar, rest } = splitForSidebar(organismNameLeaf("Homo sapiens"), null)
    expect(sidebar.texts.organismName).toBe("Homo sapiens")
    expect(isIdentityAst(rest)).toBe(true)
  })

  test("extractsOrganismNameAsTextInEsScope", () => {
    const { sidebar, rest } = splitForSidebar(organismNameLeaf("Homo sapiens"), "bioproject")
    expect(sidebar.texts.organismName).toBe("Homo sapiens")
    expect(isIdentityAst(rest)).toBe(true)
  })

  test("organismIdAndNameSplitToSeparateAxes", () => {
    // organism_id lands on the facet, organism_name on its own text row — the two
    // organism axes do not collide.
    const ast: ParseNode = {
      op: "AND",
      rules: [organismLeaf("9606"), organismNameLeaf("Homo sapiens")],
    }
    const { sidebar, rest } = splitForSidebar(ast, null)
    expect(sidebar.facets.organism).toEqual(["9606"])
    expect(sidebar.texts.organismName).toBe("Homo sapiens")
    expect(isIdentityAst(rest)).toBe(true)
  })

  test("organismNameTextRoundTrip", () => {
    const state: SearchFacetState = {
      ...createInitialSearchFacetState(),
      texts: { organismName: "Homo sapiens" },
    }
    const ast = fromSidebar(state, { db: null }, FIXED_NOW)
    const { sidebar } = splitForSidebar(ast, null, FIXED_NOW)
    expect(sidebar.texts.organismName).toBe("Homo sapiens")
  })

  test("extractsTextField", () => {
    // DSL field submitter maps back to the organization sidebar row.
    const ast: ParseNode = { op: "contains", field: "submitter", value: "RIKEN" }
    const { sidebar, rest } = splitForSidebar(ast, "bioproject")
    expect(sidebar.texts.organization).toBe("RIKEN")
    expect(isIdentityAst(rest)).toBe(true)
  })

  test("extractsEnumFacet", () => {
    const ast: ParseNode = { op: "eq", field: "object_type", value: "BioProject" }
    const { sidebar } = splitForSidebar(ast, "bioproject")
    expect(sidebar.facets.objectType).toEqual(["BioProject"])
  })

  test("scopeAware_nonScopeFieldGoesToRest", () => {
    // object_type is not a cross-scope row → stays in rest.
    const ast: ParseNode = { op: "eq", field: "object_type", value: "BioProject" }
    const { sidebar, rest } = splitForSidebar(ast, null)
    expect(sidebar.facets.objectType).toBeUndefined()
    const leaf = rest as { op: string; field?: string }
    expect(leaf.field).toBe("object_type")
  })

  test("splitsMixedAndIntoSidebarAndRest", () => {
    const ast: ParseNode = {
      op: "AND",
      rules: [organismLeaf("9606"), { op: "eq", field: "title", value: "cancer" }],
    }
    const { sidebar, rest } = splitForSidebar(ast)
    expect(sidebar.facets.organism).toEqual(["9606"])
    const leaf = rest as { op: string; field?: string }
    expect(leaf.op).toBe("eq")
    expect(leaf.field).toBe("title")
  })

  test("nonSidebarLeaf_returnedInRest", () => {
    const ast: ParseNode = { op: "eq", field: "title", value: "cancer" }
    const { sidebar, rest } = splitForSidebar(ast)
    expect(sidebar.facets.organism).toBeUndefined()
    const leaf = rest as { op: string; field?: string }
    expect(leaf.field).toBe("title")
  })

  test("recognizesDatePresetFromBetween", () => {
    const { sidebar } = splitForSidebar(presetBetween("1y"), null, FIXED_NOW)
    expect(sidebar.dateRanges.datePublished).toEqual({ active: "1y", from: "", to: "" })
  })

  test("nonPresetBetween_becomesCustom", () => {
    const ast: ParseNode = {
      op: "between",
      field: "date_published",
      from: "2001-02-03",
      to: "2009-08-07",
    }
    const { sidebar } = splitForSidebar(ast, null, FIXED_NOW)
    expect(sidebar.dateRanges.datePublished).toEqual({
      active: "custom",
      from: "2001-02-03",
      to: "2009-08-07",
    })
  })

  test("datePresetRoundTrip_preservesPreset", () => {
    // The bug this guards: picking "5y" emits a concrete between into the URL,
    // and restoring from the URL must recover "5y" (not fall back to "all").
    const state: SearchFacetState = {
      ...createInitialSearchFacetState(),
      dateRanges: { datePublished: { active: "5y", from: "", to: "" } },
    }
    const ast = fromSidebar(state, { db: null }, FIXED_NOW)
    const { sidebar } = splitForSidebar(ast, null, FIXED_NOW)
    expect(sidebar.dateRanges.datePublished).toEqual({ active: "5y", from: "", to: "" })
  })
})
