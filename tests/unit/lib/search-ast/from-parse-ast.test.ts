import { describe, expect, it } from "vitest"

import {
  type ParseAst,
  parseAstToSearchAst,
} from "@/lib/search-ast/from-parse-ast"
import { astToDsl } from "@/lib/search-ast/to-dsl"

import {
  assertBoolOp,
  assertFieldLeaf,
  assertFieldRange,
  assertFreeText,
} from "../../../helpers/ast-asserts"

describe("parseAstToSearchAst", () => {
  it("free_text variant", () => {
    const parsed: ParseAst = { op: "free_text", value: "cancer" }
    const ast = parseAstToSearchAst(parsed)
    assertFreeText(ast)
    expect(ast.value).toBe("cancer")
  })

  it("eq leaf", () => {
    const parsed: ParseAst = { op: "eq", field: "organism", value: "Homo sapiens" }
    const ast = parseAstToSearchAst(parsed)
    assertFieldLeaf(ast)
    expect(ast.op).toBe("eq")
    expect(ast.field).toBe("organism")
    expect(ast.value).toBe("Homo sapiens")
  })

  it("between range", () => {
    const parsed: ParseAst = {
      op: "between",
      field: "date_published",
      from: "2020-01-01",
      to: "2024-12-31",
    }
    const ast = parseAstToSearchAst(parsed)
    assertFieldRange(ast)
    expect(ast.from).toBe("2020-01-01")
    expect(ast.to).toBe("2024-12-31")
  })

  it("AND with multiple children including free_text", () => {
    const parsed: ParseAst = {
      op: "AND",
      rules: [
        { op: "free_text", value: "cancer" },
        { op: "eq", field: "organism", value: "Homo sapiens" },
        { op: "between", field: "date_published", from: "2020-01-01", to: "2024-12-31" },
      ],
    }
    const ast = parseAstToSearchAst(parsed)
    assertBoolOp(ast)
    expect(ast.op).toBe("AND")
    expect(ast.children).toHaveLength(3)
    assertFreeText(ast.children[0])
  })

  it("NOT", () => {
    const parsed: ParseAst = {
      op: "NOT",
      rules: [{ op: "eq", field: "title", value: "tumor" }],
    }
    const ast = parseAstToSearchAst(parsed)
    assertBoolOp(ast)
    expect(ast.op).toBe("NOT")
    expect(ast.children).toHaveLength(1)
  })

  it("round-trip: parse → AST → DSL preserves structure", () => {
    const parsed: ParseAst = {
      op: "AND",
      rules: [
        { op: "free_text", value: "cancer" },
        { op: "eq", field: "organism", value: "Homo sapiens" },
      ],
    }
    const ast = parseAstToSearchAst(parsed)
    expect(astToDsl(ast)).toBe('"cancer" AND organism:"Homo sapiens"')
  })

  it("each call assigns fresh ids", () => {
    const parsed: ParseAst = { op: "free_text", value: "cancer" }
    const a = parseAstToSearchAst(parsed)
    const b = parseAstToSearchAst(parsed)
    expect(a.id).not.toBe(b.id)
  })
})
