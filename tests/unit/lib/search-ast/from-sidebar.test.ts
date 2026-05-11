import { describe, expect, it } from "vitest"

import { sidebarStateToAst } from "@/lib/search-ast/from-sidebar"
import { astToDsl } from "@/lib/search-ast/to-dsl"
import type { SidebarState } from "@/lib/sidebar-state-types"

const empty = (): SidebarState => ({
  facets: {},
  keywords: {},
  dateRange: null,
  subtype: null,
})

describe("sidebarStateToAst", () => {
  it("returns null for empty state", () => {
    expect(sidebarStateToAst(empty())).toBeNull()
  })

  it("single facet single value → field:value (no OR group)", () => {
    const ast = sidebarStateToAst({
      ...empty(),
      facets: { organism: ["Homo sapiens"] },
    })
    expect(astToDsl(ast)).toBe('organism:"Homo sapiens"')
  })

  it("single facet multi value → OR group", () => {
    const ast = sidebarStateToAst({
      ...empty(),
      facets: { organism: ["Homo sapiens", "Mus musculus"] },
    })
    expect(astToDsl(ast)).toBe('organism:"Homo sapiens" OR organism:"Mus musculus"')
  })

  it("two facets → AND of two clauses", () => {
    const ast = sidebarStateToAst({
      ...empty(),
      facets: {
        organism: ["Homo sapiens"],
        accessibility: ["public-access"],
      },
    })
    expect(astToDsl(ast)).toBe(
      'organism:"Homo sapiens" AND accessibility:public-access',
    )
  })

  it("keyword (contains)", () => {
    const ast = sidebarStateToAst({
      ...empty(),
      keywords: { host: "mouse" },
    })
    expect(astToDsl(ast)).toBe("host:mouse")
  })

  it("date range with both ends", () => {
    const ast = sidebarStateToAst({
      ...empty(),
      dateRange: {
        axis: "date_published",
        from: "2020-01-01",
        to: "2024-12-31",
      },
    })
    expect(astToDsl(ast)).toBe("date_published:[2020-01-01 TO 2024-12-31]")
  })

  it("date range with only 'from' (gte)", () => {
    const ast = sidebarStateToAst({
      ...empty(),
      dateRange: { axis: "date_published", from: "2020-01-01", to: "" },
    })
    expect(astToDsl(ast)).toBe("date_published:[2020-01-01 TO *]")
  })

  it("date range with only 'to' (lte)", () => {
    const ast = sidebarStateToAst({
      ...empty(),
      dateRange: { axis: "date_published", from: "", to: "2024-12-31" },
    })
    expect(astToDsl(ast)).toBe("date_published:[* TO 2024-12-31]")
  })

  it("subtype emitted as type:<value>", () => {
    const ast = sidebarStateToAst({ ...empty(), subtype: "sra-experiment" })
    expect(astToDsl(ast)).toBe("type:sra-experiment")
  })

  it("combines facet + keyword + date + subtype", () => {
    const ast = sidebarStateToAst({
      facets: { organism: ["Homo sapiens"] },
      keywords: { host: "mouse" },
      dateRange: {
        axis: "date_published",
        from: "2020-01-01",
        to: "2024-12-31",
      },
      subtype: "sra-experiment",
    })
    expect(astToDsl(ast)).toBe(
      'organism:"Homo sapiens" AND host:mouse '
        + "AND date_published:[2020-01-01 TO 2024-12-31] "
        + "AND type:sra-experiment",
    )
  })

  it("ignores keyword whose trimmed value is empty", () => {
    expect(
      sidebarStateToAst({ ...empty(), keywords: { host: "   " } }),
    ).toBeNull()
  })

  it("ignores empty subtype", () => {
    expect(sidebarStateToAst({ ...empty(), subtype: "" })).toBeNull()
  })
})
