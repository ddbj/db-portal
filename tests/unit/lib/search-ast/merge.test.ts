import { describe, expect, it } from "vitest"

import {
  boolAnd,
  boolNot,
  boolOr,
  fieldEq,
  freeText,
} from "@/lib/search-ast/factory"
import { mergeAstAnd } from "@/lib/search-ast/merge"
import { AstInvariantError, isFreeText } from "@/lib/search-ast/types"

import { assertBoolOp } from "../../../helpers/ast-asserts"

describe("mergeAstAnd - basic", () => {
  it("returns null for empty / all-null inputs", () => {
    expect(mergeAstAnd([])).toBeNull()
    expect(mergeAstAnd([null])).toBeNull()
    expect(mergeAstAnd([null, null, undefined])).toBeNull()
  })

  it("returns single AST as-is when only one non-null", () => {
    const a = fieldEq("title", "cancer")
    expect(mergeAstAnd([a, null])).toBe(a)
  })

  it("merges two ASTs with AND", () => {
    const a = fieldEq("title", "cancer")
    const b = fieldEq("organism", "Homo sapiens")
    const merged = mergeAstAnd([a, b])
    assertBoolOp(merged)
    expect(merged.op).toBe("AND")
    expect(merged.children).toHaveLength(2)
  })

  it("flattens nested AND", () => {
    const a = boolAnd([
      fieldEq("title", "cancer"),
      fieldEq("organism", "Homo sapiens"),
    ])
    const b = fieldEq("date", "2024")
    const merged = mergeAstAnd([a, b])
    assertBoolOp(merged)
    expect(merged.op).toBe("AND")
    expect(merged.children).toHaveLength(3)
  })

  it("preserves OR child as a single node (not flattened)", () => {
    const a = boolOr([
      fieldEq("title", "cancer"),
      fieldEq("title", "tumor"),
    ])
    const b = fieldEq("organism", "Homo sapiens")
    const merged = mergeAstAnd([a, b])
    assertBoolOp(merged)
    expect(merged.op).toBe("AND")
    expect(merged.children).toHaveLength(2)
    expect(merged.children[0]).toBe(a)
  })
})

describe("mergeAstAnd - FreeText invariant", () => {
  it("allows root FreeText alone", () => {
    const a = freeText("cancer")
    expect(mergeAstAnd([a, null])).toBe(a)
  })

  it("allows FreeText as direct AND child (one)", () => {
    const a = freeText("cancer")
    const b = fieldEq("organism", "Homo sapiens")
    const merged = mergeAstAnd([a, b])
    assertBoolOp(merged)
    expect(merged.children.filter(isFreeText)).toHaveLength(1)
  })

  it("places FreeText first in merged AND children", () => {
    const a = fieldEq("organism", "Homo sapiens")
    const b = freeText("cancer")
    const merged = mergeAstAnd([a, b])
    assertBoolOp(merged)
    const first = merged.children[0]
    expect(first !== undefined && isFreeText(first)).toBe(true)
  })

  it("throws duplicate_freetext when 2 FreeText siblings", () => {
    const a = freeText("cancer")
    const b = freeText("tumor")
    expect(() => mergeAstAnd([a, b])).toThrow(AstInvariantError)
    expect(() => mergeAstAnd([a, b])).toThrowError(/more than one FreeText/i)
  })

  it("throws invalid_freetext_position when FreeText inside OR", () => {
    const bad = boolOr([freeText("cancer"), fieldEq("title", "tumor")])
    expect(() => mergeAstAnd([bad])).toThrow(AstInvariantError)
    expect(() => mergeAstAnd([bad])).toThrowError(/FreeText must be at AST root/i)
  })

  it("throws invalid_freetext_position when FreeText inside NOT", () => {
    const bad = boolNot(freeText("cancer"))
    expect(() => mergeAstAnd([bad])).toThrow(AstInvariantError)
  })

  it("flattens nested AND that wraps FreeText (so it ends up as direct child of root AND)", () => {
    const bad = boolAnd([
      boolAnd([freeText("cancer")]),
      fieldEq("organism", "Homo sapiens"),
    ])
    const merged = mergeAstAnd([bad])
    expect(merged).not.toBeNull()
  })
})
