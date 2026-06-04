import fc from "fast-check"
import { describe, expect, it } from "vitest"

import { findExactMatch, isIdentityAst, mergeAstAnd, splitFreeText } from "~/features/search"
import type { CrossSearchResponse, ParseNode } from "~/lib/api"

const freeTextArb: fc.Arbitrary<ParseNode> = fc.record({
  op: fc.constant("free_text" as const),
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

const databases = (hits: Record<string, unknown>[]): CrossSearchResponse["databases"] =>
  [{ db: "sra", count: hits.length, error: null, hits }] as unknown as CrossSearchResponse["databases"]

describe("findExactMatch invariants", () => {
  it("a query with any structured remainder never yields an exact match", () => {
    fc.assert(
      fc.property(
        fc.array(freeTextArb, { minLength: 1, maxLength: 3 }),
        fc.array(structuredArb, { minLength: 1, maxLength: 3 }),
        (ft, structured) => {
          const ast = mergeAstAnd(...ft, ...structured)
          // The gate must reject even when a top hit would match a free_text value.
          const first = ft[0] as Extract<ParseNode, { op: "free_text" }>
          const dbs = databases([{ identifier: first.value, type: "sra-run" }])
          expect(isIdentityAst(splitFreeText(ast).rest)).toBe(false)
          expect(findExactMatch(ast, dbs)).toBeNull()
        },
      ),
    )
  })

  it("accession match ignores case", () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[A-Za-z0-9-]{1,10}$/), (token) => {
        const dbs = databases([{ identifier: token.toUpperCase(), type: "sra-run" }])
        const match = findExactMatch({ op: "free_text", value: token.toLowerCase(), is_phrase: false }, dbs)
        expect(match?.hit.identifier).toBe(token.toUpperCase())
      }),
    )
  })

  it("a free_text value carrying a wildcard never matches, even against an identical identifier", () => {
    fc.assert(
      fc.property(fc.stringMatching(/^[A-Za-z0-9-]{1,8}$/), fc.constantFrom("*", "?"), (token, wild) => {
        const value = token + wild
        const dbs = databases([{ identifier: value, type: "sra-run" }])
        expect(findExactMatch({ op: "free_text", value, is_phrase: false }, dbs)).toBeNull()
      }),
    )
  })
})
