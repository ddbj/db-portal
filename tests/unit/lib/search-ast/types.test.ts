import { describe, expect, it } from "vitest"

import {
  boolAnd,
  boolNot,
  boolOr,
  fieldBetween,
  fieldEq,
  freeText,
} from "@/lib/search-ast/factory"
import {
  isBoolOp,
  isFieldClause,
  isFieldLeaf,
  isFieldRange,
  isFreeText,
} from "@/lib/search-ast/types"

describe("type guards", () => {
  it("isFreeText", () => {
    expect(isFreeText(freeText("cancer"))).toBe(true)
    expect(isFreeText(fieldEq("title", "cancer"))).toBe(false)
    expect(isFreeText(boolAnd([]))).toBe(false)
  })

  it("isFieldClause", () => {
    expect(isFieldClause(fieldEq("title", "x"))).toBe(true)
    expect(isFieldClause(fieldBetween("date", "a", "b"))).toBe(true)
    expect(isFieldClause(freeText("x"))).toBe(false)
    expect(isFieldClause(boolAnd([]))).toBe(false)
  })

  it("isBoolOp", () => {
    expect(isBoolOp(boolAnd([]))).toBe(true)
    expect(isBoolOp(boolOr([]))).toBe(true)
    expect(isBoolOp(boolNot(freeText("x")))).toBe(true)
    expect(isBoolOp(freeText("x"))).toBe(false)
    expect(isBoolOp(fieldEq("a", "b"))).toBe(false)
  })

  it("isFieldRange / isFieldLeaf", () => {
    const range = fieldBetween("date", "2020", "2024")
    const leaf = fieldEq("title", "x")
    expect(isFieldRange(range)).toBe(true)
    expect(isFieldRange(leaf)).toBe(false)
    expect(isFieldLeaf(leaf)).toBe(true)
    expect(isFieldLeaf(range)).toBe(false)
  })

  it("nodes are immutable (readonly properties via type)", () => {
    const node = fieldEq("title", "cancer")
    expect(node.id).toMatch(/.+/)
    expect(node.kind).toBe("field_clause")
    expect(node.field).toBe("title")
    expect(node.op).toBe("eq")
    expect(node.value).toBe("cancer")
  })
})
