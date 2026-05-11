import { describe, expect, it } from "vitest"

import { qStringToAst } from "@/lib/search-ast/from-q"
import { astToDsl } from "@/lib/search-ast/to-dsl"

import { assertFreeText } from "../../../helpers/ast-asserts"

describe("qStringToAst", () => {
  it("returns null for null/undefined/empty/whitespace", () => {
    expect(qStringToAst(null)).toBeNull()
    expect(qStringToAst(undefined)).toBeNull()
    expect(qStringToAst("")).toBeNull()
    expect(qStringToAst("   ")).toBeNull()
  })

  it("creates FreeText for non-empty input", () => {
    const ast = qStringToAst("cancer")
    assertFreeText(ast)
    expect(ast.value).toBe("cancer")
  })

  it("trims surrounding whitespace", () => {
    const ast = qStringToAst("  cancer  ")
    assertFreeText(ast)
    expect(ast.value).toBe("cancer")
  })

  it("treats DSL-like input as plain text (escaped via quote in DSL)", () => {
    const ast = qStringToAst("organism:Homo")
    expect(astToDsl(ast)).toBe('"organism:Homo"')
  })

  it("preserves multi-word input as a single FreeText (phrase)", () => {
    const ast = qStringToAst("Homo sapiens")
    expect(astToDsl(ast)).toBe('"Homo sapiens"')
  })
})
