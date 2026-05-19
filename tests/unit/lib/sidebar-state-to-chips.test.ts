import { describe, expect, it } from "vitest"

import { sidebarFieldsForDb } from "@/lib/sidebar-fields"
import {
  clearAllSidebar,
  sidebarStateToChips,
} from "@/lib/sidebar-state-to-chips"
import {
  type SidebarState,
} from "@/lib/sidebar-state-types"

const bioprojectFields = sidebarFieldsForDb("bioproject", null)
const sraExpFields = sidebarFieldsForDb("sra", "sra-experiment")

const baseState: SidebarState = {
  facets: {},
  keywords: {},
  dateRange: null,
  subtype: null,
  freeText: "",
}

describe("sidebarStateToChips", () => {
  it("returns empty when no filters are applied", () => {
    expect(sidebarStateToChips(baseState, bioprojectFields)).toEqual([])
  })

  it("creates one chip per facet value", () => {
    const state: SidebarState = {
      ...baseState,
      facets: { organism: ["Homo sapiens", "Mus musculus"] },
    }
    const chips = sidebarStateToChips(state, bioprojectFields)
    expect(chips).toHaveLength(2)
    expect(chips[0]).toMatchObject({
      kind: "facet",
      labelKey: "routes.search.fields.organism.label",
      value: "Homo sapiens",
    })
    expect(chips[1]).toMatchObject({ value: "Mus musculus" })
  })

  it("skips facets whose dslName has no mapping in the db's fields", () => {
    const state: SidebarState = {
      ...baseState,
      facets: { not_a_real_field: ["x"] },
    }
    expect(sidebarStateToChips(state, bioprojectFields)).toEqual([])
  })

  it("creates one chip per keyword and skips empty strings", () => {
    const state: SidebarState = {
      ...baseState,
      keywords: { library_name: "lib_001", library_construction_protocol: "" },
    }
    const chips = sidebarStateToChips(state, sraExpFields)
    expect(chips).toHaveLength(1)
    expect(chips[0]).toMatchObject({
      kind: "keyword",
      value: "lib_001",
    })
  })

  it("creates one date chip with axis-specific label", () => {
    const state: SidebarState = {
      ...baseState,
      dateRange: { axis: "date_modified", from: "2020-01-01", to: "2024-12-31" },
    }
    const chips = sidebarStateToChips(state, bioprojectFields)
    expect(chips).toHaveLength(1)
    expect(chips[0]).toMatchObject({
      kind: "date",
      labelKey: "routes.searchResults.sidebar.dateRange.axis.date_modified",
      from: "2020-01-01",
      to: "2024-12-31",
    })
  })

  it("does not create chips for subtype or freeText", () => {
    const state: SidebarState = {
      ...baseState,
      subtype: "sra-experiment",
      freeText: "cancer",
    }
    expect(sidebarStateToChips(state, sraExpFields)).toEqual([])
  })

  it("nextState removes only the targeted facet value", () => {
    const state: SidebarState = {
      ...baseState,
      facets: {
        organism: ["Homo sapiens", "Mus musculus"],
        relevance: ["Medical"],
      },
    }
    const chips = sidebarStateToChips(state, bioprojectFields)
    const homoChip = chips.find(
      (c) => c.kind === "facet" && c.value === "Homo sapiens",
    )
    expect(homoChip).toBeDefined()
    expect(homoChip!.nextState.facets).toEqual({
      organism: ["Mus musculus"],
      relevance: ["Medical"],
    })
  })

  it("nextState drops the facet key entirely when the last value is removed", () => {
    const state: SidebarState = {
      ...baseState,
      facets: { organism: ["Homo sapiens"] },
    }
    const chips = sidebarStateToChips(state, bioprojectFields)
    expect(chips[0]!.nextState.facets).toEqual({})
  })

  it("nextState for keyword removes only that keyword entry", () => {
    const state: SidebarState = {
      ...baseState,
      keywords: { library_name: "lib_001", library_construction_protocol: "TruSeq" },
    }
    const chips = sidebarStateToChips(state, sraExpFields)
    const libChip = chips.find(
      (c) => c.kind === "keyword" && c.value === "lib_001",
    )
    expect(libChip!.nextState.keywords).toEqual({
      library_construction_protocol: "TruSeq",
    })
  })

  it("nextState for date sets dateRange to null", () => {
    const state: SidebarState = {
      ...baseState,
      dateRange: { axis: "date_published", from: "2020-01-01", to: "" },
    }
    const chips = sidebarStateToChips(state, bioprojectFields)
    expect(chips[0]!.nextState.dateRange).toBeNull()
  })
})

describe("clearAllSidebar", () => {
  it("clears facets, keywords, dateRange, subtype while preserving freeText", () => {
    const state: SidebarState = {
      facets: { organism: ["Homo sapiens"] },
      keywords: { host: "kidney" },
      dateRange: { axis: "date_published", from: "2020-01-01", to: "2024-12-31" },
      subtype: "sra-experiment",
      freeText: "cancer",
    }
    expect(clearAllSidebar(state)).toEqual({
      facets: {},
      keywords: {},
      dateRange: null,
      subtype: null,
      freeText: "cancer",
    })
  })
})
