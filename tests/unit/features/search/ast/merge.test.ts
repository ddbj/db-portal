import { describe, expect, test } from "vitest"

import { astEquals, identityAst, isIdentityAst, mergeAstAnd } from "~/features/search"
import type { ParseNode } from "~/lib/api"

type AndNode = { op: "AND"; rules: ParseNode[] }

const expectAnd = (node: ParseNode): AndNode => {
  if (node.op !== "AND") throw new Error(`expected AND, got ${node.op}`)

  return node as AndNode
}

describe("mergeAstAnd", () => {
  test("mergeAstAnd_empty_returnsIdentity", () => {
    expect(isIdentityAst(mergeAstAnd())).toBe(true)
  })

  test("mergeAstAnd_singleNonIdentity_returnsAsIs", () => {
    const leaf: ParseNode = { op: "eq", field: "organism", value: "Homo sapiens" }
    expect(astEquals(mergeAstAnd(leaf), leaf)).toBe(true)
  })

  test("mergeAstAnd_twoLeaves_returnsAndOfTwo", () => {
    const a: ParseNode = { op: "eq", field: "organism", value: "Homo sapiens" }
    const b: ParseNode = { op: "eq", field: "title", value: "cancer" }
    const merged = expectAnd(mergeAstAnd(a, b))
    expect(merged.rules.length).toBe(2)
  })

  test("mergeAstAnd_flattensInnerAnd", () => {
    const a: ParseNode = { op: "eq", field: "organism", value: "Homo sapiens" }
    const b: ParseNode = { op: "eq", field: "title", value: "cancer" }
    const c: ParseNode = { op: "eq", field: "identifier", value: "PRJDB1" }
    const inner: ParseNode = { op: "AND", rules: [a, b] }
    const merged = expectAnd(mergeAstAnd(inner, c))
    expect(merged.rules.length).toBe(3)
    expect(merged.rules.every((rule) => rule.op !== "AND")).toBe(true)
  })

  test("mergeAstAnd_identitySkipped", () => {
    const leaf: ParseNode = { op: "eq", field: "organism", value: "Homo sapiens" }
    const merged = mergeAstAnd(identityAst, leaf, identityAst)
    expect(astEquals(merged, leaf)).toBe(true)
  })
})

describe("astEquals", () => {
  test("astEquals_freeTextSameValueSamePhrase_isEqual", () => {
    const a: ParseNode = { op: "free_text", value: "cancer", is_phrase: true }
    const b: ParseNode = { op: "free_text", value: "cancer", is_phrase: true }
    expect(astEquals(a, b)).toBe(true)
  })

  test("astEquals_freeTextSameValueDifferentPhrase_isNotEqual", () => {
    // is_phrase changes the compiled query (phrase vs bare tokens), so toggling it
    // must register as a change (else a re-search would be skipped).
    const phrase: ParseNode = { op: "free_text", value: "single cell", is_phrase: true }
    const bare: ParseNode = { op: "free_text", value: "single cell", is_phrase: false }
    expect(astEquals(phrase, bare)).toBe(false)
  })
})
