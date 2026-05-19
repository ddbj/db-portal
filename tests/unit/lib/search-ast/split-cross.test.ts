import { describe, expect, it } from "vitest"

import {
  boolAnd,
  boolOr,
  fieldBetween,
  fieldContains,
  fieldEq,
  freeText,
} from "@/lib/search-ast/factory"
import { splitAstForCrossSidebar } from "@/lib/search-ast/split-cross"

describe("splitAstForCrossSidebar", () => {
  it("null AST → empty sidebar, null residual", () => {
    const r = splitAstForCrossSidebar(null)
    expect(r.sidebar.facets).toEqual({})
    expect(r.sidebar.keywords).toEqual({})
    expect(r.sidebar.dateRange).toBeNull()
    expect(r.sidebar.subtype).toBeNull()
    expect(r.sidebar.freeText).toBe("")
    expect(r.residual).toBeNull()
  })

  it("free text only → sidebar.freeText, no residual", () => {
    const r = splitAstForCrossSidebar(freeText("cancer"))
    expect(r.sidebar.freeText).toBe("cancer")
    expect(r.residual).toBeNull()
  })

  it("organism eq → sidebar.facets.organism", () => {
    const r = splitAstForCrossSidebar(fieldEq("organism", "Homo sapiens"))
    expect(r.sidebar.facets).toEqual({ organism: ["Homo sapiens"] })
    expect(r.residual).toBeNull()
  })

  it("organism OR group → multi-value facet", () => {
    const r = splitAstForCrossSidebar(
      boolOr([
        fieldEq("organism", "Homo sapiens"),
        fieldEq("organism", "Mus musculus"),
      ]),
    )
    expect(r.sidebar.facets).toEqual({
      organism: ["Homo sapiens", "Mus musculus"],
    })
    expect(r.residual).toBeNull()
  })

  it("date_published between → dateRange", () => {
    const r = splitAstForCrossSidebar(
      fieldBetween("date_published", "2020-01-01", "2024-12-31"),
    )
    expect(r.sidebar.dateRange).toEqual({
      axis: "date_published",
      from: "2020-01-01",
      to: "2024-12-31",
    })
    expect(r.residual).toBeNull()
  })

  it("AND of free text + organism + date_published → all consumed", () => {
    const r = splitAstForCrossSidebar(
      boolAnd([
        freeText("cancer"),
        fieldEq("organism", "Homo sapiens"),
        fieldBetween("date_published", "2020-01-01", "2024-12-31"),
      ]),
    )
    expect(r.sidebar.freeText).toBe("cancer")
    expect(r.sidebar.facets).toEqual({ organism: ["Homo sapiens"] })
    expect(r.sidebar.dateRange).toEqual({
      axis: "date_published",
      from: "2020-01-01",
      to: "2024-12-31",
    })
    expect(r.residual).toBeNull()
  })

  it("date_modified between is not consumed (cross axis is date_published only)", () => {
    const node = fieldBetween("date_modified", "2020-01-01", "2024-12-31")
    const r = splitAstForCrossSidebar(node)
    expect(r.sidebar.dateRange).toBeNull()
    expect(r.residual).toBe(node)
  })

  it("DB-specific keyword (library_name) is not consumed in cross", () => {
    const node = fieldContains("library_name", "DRR12345")
    const r = splitAstForCrossSidebar(node)
    expect(r.sidebar.keywords).toEqual({})
    expect(r.residual).toBe(node)
  })

  it("subtype (type eq) is not consumed in cross", () => {
    const node = fieldEq("type", "sra-experiment")
    const r = splitAstForCrossSidebar(node)
    expect(r.sidebar.subtype).toBeNull()
    expect(r.residual).toBe(node)
  })

  it("AND with mixed allowed + disallowed → allowed consumed, disallowed kept as residual", () => {
    const r = splitAstForCrossSidebar(
      boolAnd([
        fieldEq("organism", "Homo sapiens"),
        fieldContains("library_name", "DRR12345"),
      ]),
    )
    expect(r.sidebar.facets).toEqual({ organism: ["Homo sapiens"] })
    expect(r.residual).toMatchObject({
      kind: "field_clause",
      field: "library_name",
      op: "contains",
      value: "DRR12345",
    })
  })

  it("duplicate free text → second remains as residual", () => {
    const r = splitAstForCrossSidebar(
      boolAnd([freeText("cancer"), freeText("tumor")]),
    )
    expect(r.sidebar.freeText).toBe("cancer")
    expect(r.residual).toMatchObject({ kind: "free_text", value: "tumor" })
  })
})
