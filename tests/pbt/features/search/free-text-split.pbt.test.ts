import fc from "fast-check"
import { describe, expect, it, test } from "vitest"

import { astEquals, identityAst, mergeAstAnd, splitFreeText } from "~/features/search"
import type { ParseNode } from "~/lib/api"

const freeTextArb: fc.Arbitrary<ParseNode> = fc.record({
  op: fc.constant("free_text" as const),
  // No spaces: a bare token is a single free_text leaf, so the space-join stays
  // a faithful inverse of the split.
  value: fc.stringMatching(/^[A-Za-z0-9-]{1,10}$/),
  is_phrase: fc.boolean(),
})

const structuredArb: fc.Arbitrary<ParseNode> = fc.oneof(
  fc.record({
    op: fc.constantFrom("eq" as const, "contains" as const),
    field: fc.constantFrom("title", "organism_id", "submitter"),
    value: fc.stringMatching(/^[A-Za-z0-9 ]{1,10}$/),
  }),
  fc.record({
    op: fc.constant("between" as const),
    field: fc.constant("date_published"),
    from: fc.constant("2020-01-01"),
    to: fc.constant("2024-12-31"),
  }),
)

const isTopLevelFreeText = (node: ParseNode): boolean =>
  node.op === "free_text" || (node.op === "AND" && node.rules.some((r) => r.op === "free_text"))

describe("splitFreeText", () => {
  it("rest is exactly the non-free-text remainder of a top-level AND", () => {
    fc.assert(
      fc.property(
        fc.array(freeTextArb, { maxLength: 3 }),
        fc.array(structuredArb, { maxLength: 3 }),
        (ft, structured) => {
          const ast = mergeAstAnd(...ft, ...structured)
          const { rest } = splitFreeText(ast)
          expect(astEquals(rest, mergeAstAnd(...structured))).toBe(true)
        },
      ),
    )
  })

  it("rest never holds a top-level free_text", () => {
    fc.assert(
      fc.property(
        fc.array(freeTextArb, { maxLength: 3 }),
        fc.array(structuredArb, { maxLength: 3 }),
        (ft, structured) => {
          const { rest } = splitFreeText(mergeAstAnd(...ft, ...structured))
          expect(isTopLevelFreeText(rest)).toBe(false)
        },
      ),
    )
  })

  it("captures every free_text value into the keyword string", () => {
    fc.assert(
      fc.property(fc.array(freeTextArb, { minLength: 1, maxLength: 3 }), (ft) => {
        const { keyword } = splitFreeText(mergeAstAnd(...ft))
        for (const node of ft) {
          if (node.op !== "free_text") continue
          expect(keyword.includes(node.value)).toBe(true)
        }
      }),
    )
  })

  it("is idempotent: splitting the rest yields no further keyword", () => {
    fc.assert(
      fc.property(
        fc.array(freeTextArb, { maxLength: 3 }),
        fc.array(structuredArb, { maxLength: 3 }),
        (ft, structured) => {
          const { rest } = splitFreeText(mergeAstAnd(...ft, ...structured))
          const again = splitFreeText(rest)
          expect(again.keyword).toBe("")
          expect(astEquals(again.keywordAst, identityAst)).toBe(true)
        },
      ),
    )
  })
})

describe("splitFreeText (examples)", () => {
  test("a single bare free_text becomes the keyword, rest is empty", () => {
    const { keyword, keywordAst, rest } = splitFreeText({
      op: "free_text",
      value: "human",
      is_phrase: false,
    })
    expect(keyword).toBe("human")
    expect(astEquals(keywordAst, { op: "free_text", value: "human", is_phrase: false })).toBe(true)
    expect(astEquals(rest, identityAst)).toBe(true)
  })

  test("a phrase free_text is re-quoted", () => {
    const { keyword } = splitFreeText({
      op: "free_text",
      value: "Homo sapiens",
      is_phrase: true,
    })
    expect(keyword).toBe("\"Homo sapiens\"")
  })

  test("multiple top-level free_text leaves join with a space, structured stays in rest", () => {
    const ast: ParseNode = {
      op: "AND",
      rules: [
        { op: "free_text", value: "human", is_phrase: false },
        { op: "contains", field: "title", value: "cancer" },
        { op: "free_text", value: "Mus musculus", is_phrase: true },
      ],
    }
    const { keyword, rest } = splitFreeText(ast)
    expect(keyword).toBe("human \"Mus musculus\"")
    expect(astEquals(rest, { op: "contains", field: "title", value: "cancer" })).toBe(true)
  })

  test("free_text nested under OR stays in rest with an empty keyword", () => {
    const ast: ParseNode = {
      op: "OR",
      rules: [
        { op: "free_text", value: "human", is_phrase: false },
        { op: "contains", field: "title", value: "cancer" },
      ],
    }
    const { keyword, rest } = splitFreeText(ast)
    expect(keyword).toBe("")
    expect(astEquals(rest, ast)).toBe(true)
  })
})
