import { describe, expect, it } from "vitest"

import {
  boolAnd,
  boolOr,
  fieldBetween,
  fieldContains,
  fieldEq,
  fieldWildcard,
  freeText,
} from "@/lib/search-ast/factory"
import { splitAstForSidebar } from "@/lib/search-ast/split"

import { assertBoolOp } from "../../../helpers/ast-asserts"

describe("splitAstForSidebar", () => {
  it("null AST → empty sidebar, null residual", () => {
    const result = splitAstForSidebar(null, "bioproject")
    expect(result.sidebar.facets).toEqual({})
    expect(result.sidebar.keywords).toEqual({})
    expect(result.sidebar.dateRange).toBeNull()
    expect(result.sidebar.subtype).toBeNull()
    expect(result.sidebar.freeText).toBe("")
    expect(result.residual).toBeNull()
  })

  it("single facet eq → sidebar.facets, no residual", () => {
    const ast = fieldEq("organism", "Homo sapiens")
    const result = splitAstForSidebar(ast, "bioproject")
    expect(result.sidebar.facets).toEqual({ organism: ["Homo sapiens"] })
    expect(result.residual).toBeNull()
  })

  it("OR of multiple eq for same facet field → multi-value facet", () => {
    const ast = boolOr([
      fieldEq("organism", "Homo sapiens"),
      fieldEq("organism", "Mus musculus"),
    ])
    const result = splitAstForSidebar(ast, "bioproject")
    expect(result.sidebar.facets).toEqual({
      organism: ["Homo sapiens", "Mus musculus"],
    })
    expect(result.residual).toBeNull()
  })

  it("AND with facet + keyword + date + subtype + free_text", () => {
    const ast = boolAnd([
      freeText("cancer"),
      fieldEq("organism", "Homo sapiens"),
      fieldContains("library_name", "DRR12345"),
      fieldBetween("date_published", "2020-01-01", "2024-12-31"),
      fieldEq("type", "sra-experiment"),
    ])
    const result = splitAstForSidebar(ast, "sra")
    expect(result.sidebar.subtype).toBe("sra-experiment")
    expect(result.sidebar.facets).toEqual({ organism: ["Homo sapiens"] })
    expect(result.sidebar.keywords).toEqual({ library_name: "DRR12345" })
    expect(result.sidebar.dateRange).toEqual({
      axis: "date_published",
      from: "2020-01-01",
      to: "2024-12-31",
    })
    expect(result.sidebar.freeText).toBe("cancer")
    expect(result.residual).toBeNull()
  })

  it("FreeText alone is absorbed into sidebar.freeText", () => {
    const ast = freeText("cancer")
    const result = splitAstForSidebar(ast, "bioproject")
    expect(result.sidebar.freeText).toBe("cancer")
    expect(result.residual).toBeNull()
  })

  it("multiple FreeText: first absorbed, rest goes to residual", () => {
    const ast = boolAnd([freeText("cancer"), freeText("brca1")])
    const result = splitAstForSidebar(ast, "bioproject")
    expect(result.sidebar.freeText).toBe("cancer")
    expect(result.residual).not.toBeNull()
  })

  it("unknown field clause → goes to residual", () => {
    const ast = fieldEq("unknown_field", "x")
    const result = splitAstForSidebar(ast, "bioproject")
    expect(result.residual).toBe(ast)
  })

  it("wildcard never consumed (residual)", () => {
    const ast = fieldWildcard("identifier", "PRJ*")
    const result = splitAstForSidebar(ast, "bioproject")
    expect(result.residual).toBe(ast)
  })

  it("multiple residual children → wrapped in AND", () => {
    const ast = boolAnd([
      fieldEq("unknown_field", "x"),
      fieldEq("another_unknown", "y"),
    ])
    const result = splitAstForSidebar(ast, "bioproject")
    assertBoolOp(result.residual)
    expect(result.residual.children).toHaveLength(2)
  })

  it("subtype detected before subtype-specific facets are absorbed", () => {
    const ast = boolAnd([
      fieldEq("type", "sra-experiment"),
      fieldEq("library_strategy", "WGS"),
    ])
    const result = splitAstForSidebar(ast, "sra")
    expect(result.sidebar.subtype).toBe("sra-experiment")
    expect(result.sidebar.facets).toEqual({ library_strategy: ["WGS"] })
    expect(result.residual).toBeNull()
  })

  it("conflicting subtype values → only first is kept, second goes to residual", () => {
    const ast = boolAnd([
      fieldEq("type", "sra-experiment"),
      fieldEq("type", "sra-run"),
    ])
    const result = splitAstForSidebar(ast, "sra")
    expect(result.sidebar.subtype).toBe("sra-experiment")
    expect(result.residual).not.toBeNull()
  })
})
