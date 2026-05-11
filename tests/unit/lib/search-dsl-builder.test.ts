import { describe, expect, it } from "vitest"

import {
  buildDateRangeClause,
  buildFacetClause,
  buildKeywordClause,
  mergeAdvWithSidebar,
  type SidebarState,
  sidebarStateToDsl,
} from "@/lib/search-dsl-builder"

describe("buildFacetClause", () => {
  it("空配列なら null", () => {
    expect(buildFacetClause("organism", [])).toBeNull()
  })

  it("単一値なら condition node", () => {
    const node = buildFacetClause("organism", ["9606"])
    expect(node).toEqual({
      id: expect.any(String),
      kind: "condition",
      condition: {
        field: "organism",
        operator: "equals",
        value: "9606",
      },
    })
  })

  it("複数値なら OR group", () => {
    const node = buildFacetClause("host", ["Homo sapiens", "Mus musculus"])
    if (node === null || node.kind !== "group") {
      throw new Error(`expected group node, got ${JSON.stringify(node)}`)
    }
    expect(node.logic).toBe("OR")
    expect(node.children).toHaveLength(2)
  })
})

describe("buildKeywordClause", () => {
  it("空文字 / 空白のみは null", () => {
    expect(buildKeywordClause("strain", "")).toBeNull()
    expect(buildKeywordClause("strain", "   ")).toBeNull()
  })

  it("値があれば contains", () => {
    const node = buildKeywordClause("strain", "K12")
    expect(node?.condition).toEqual({
      field: "strain",
      operator: "contains",
      value: "K12",
    })
  })

  it("trim される", () => {
    const node = buildKeywordClause("strain", "  K12  ")
    expect(node?.condition.value).toBe("K12")
  })
})

describe("buildDateRangeClause", () => {
  it("from と to 両方ありなら between", () => {
    const node = buildDateRangeClause({
      axis: "date_published",
      from: "2020-01-01",
      to: "2024-12-31",
    })
    expect(node?.condition).toEqual({
      field: "date_published",
      operator: "between",
      value: { from: "2020-01-01", to: "2024-12-31" },
    })
  })

  it("from のみなら gte", () => {
    const node = buildDateRangeClause({
      axis: "date_modified",
      from: "2020-01-01",
      to: "",
    })
    expect(node?.condition).toEqual({
      field: "date_modified",
      operator: "gte",
      value: "2020-01-01",
    })
  })

  it("to のみなら lte", () => {
    const node = buildDateRangeClause({
      axis: "date_created",
      from: "",
      to: "2024-12-31",
    })
    expect(node?.condition).toEqual({
      field: "date_created",
      operator: "lte",
      value: "2024-12-31",
    })
  })

  it("両方空なら null", () => {
    const node = buildDateRangeClause({
      axis: "date_published",
      from: "",
      to: "",
    })
    expect(node).toBeNull()
  })
})

describe("sidebarStateToDsl", () => {
  it("全て空なら null", () => {
    const state: SidebarState = {
      facets: {},
      keywords: {},
      dateRange: null,
      subtype: null,
    }
    expect(sidebarStateToDsl(state)).toBeNull()
  })

  it("単一 facet のみなら 1 condition", () => {
    const state: SidebarState = {
      facets: { organism: ["9606"] },
      keywords: {},
      dateRange: null,
      subtype: null,
    }
    const dsl = sidebarStateToDsl(state)
    expect(dsl).toBe("organism:9606")
  })

  it("subtype のみなら type:<subtype>", () => {
    const state: SidebarState = {
      facets: {},
      keywords: {},
      dateRange: null,
      subtype: "sra-experiment",
    }
    const dsl = sidebarStateToDsl(state)
    expect(dsl).toBe("type:\"sra-experiment\"")
  })

  it("複数 clause は AND 結合", () => {
    const state: SidebarState = {
      facets: { organism: ["9606"], host: ["Homo sapiens", "Mus musculus"] },
      keywords: { strain: "K12" },
      dateRange: { axis: "date_published", from: "2020-01-01", to: "2024-12-31" },
      subtype: null,
    }
    const dsl = sidebarStateToDsl(state)
    expect(dsl).toContain("AND")
    expect(dsl).toContain("organism")
    expect(dsl).toContain("host")
    expect(dsl).toContain("strain")
    expect(dsl).toContain("date_published")
  })
})

describe("mergeAdvWithSidebar", () => {
  it("両方 null なら null", () => {
    expect(mergeAdvWithSidebar(null, null)).toBeNull()
  })

  it("既存のみなら既存", () => {
    expect(mergeAdvWithSidebar("title CONTAINS x", null)).toBe("title CONTAINS x")
  })

  it("sidebar のみなら sidebar", () => {
    expect(mergeAdvWithSidebar(null, "host = Homo sapiens")).toBe("host = Homo sapiens")
  })

  it("両方ありなら ()-囲い AND 結合", () => {
    expect(mergeAdvWithSidebar("a CONTAINS x", "b = y")).toBe(
      "(a CONTAINS x) AND (b = y)",
    )
  })
})
