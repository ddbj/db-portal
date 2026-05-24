import { describe, expect, test } from "vitest"

import { isIdentityAst, splitForSidebar } from "~/features/search"

describe("splitForSidebar", () => {
  test("singleOrganismLeaf_isExtracted", () => {
    const result = splitForSidebar({ op: "eq", field: "organism", value: "Homo sapiens" })
    expect(result.sidebar.organisms).toEqual(["Homo sapiens"])
    expect(isIdentityAst(result.rest)).toBe(true)
  })

  test("orOfOrganisms_isExtracted", () => {
    const ast = {
      op: "OR" as const,
      rules: [
        { op: "eq" as const, field: "organism", value: "Homo sapiens" },
        { op: "eq" as const, field: "organism", value: "Mus musculus" },
      ],
    }
    const result = splitForSidebar(ast)
    expect(result.sidebar.organisms).toEqual(["Homo sapiens", "Mus musculus"])
  })

  test("dateRange_isExtracted", () => {
    const ast = {
      op: "between" as const,
      field: "date_published",
      from: "2020-01-01",
      to: "2024-12-31",
    }
    const result = splitForSidebar(ast)
    expect(result.sidebar.datePublished.from).toBe("2020-01-01")
    expect(result.sidebar.datePublished.to).toBe("2024-12-31")
  })

  test("unmatchedLeaf_returnedInRest", () => {
    const ast = { op: "eq" as const, field: "title", value: "cancer" }
    const result = splitForSidebar(ast)
    expect(result.sidebar.organisms).toEqual([])
    expect(result.rest.op).toBe("eq")
  })

  test("andOfMixed_splitsBetweenSidebarAndRest", () => {
    const ast = {
      op: "AND" as const,
      rules: [
        { op: "eq" as const, field: "organism", value: "Homo sapiens" },
        { op: "eq" as const, field: "title", value: "cancer" },
      ],
    }
    const result = splitForSidebar(ast)
    expect(result.sidebar.organisms).toEqual(["Homo sapiens"])
    expect(result.rest.op).toBe("eq")
  })
})
