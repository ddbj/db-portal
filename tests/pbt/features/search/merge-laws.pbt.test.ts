import { fc, test } from "@fast-check/vitest"
import { describe, expect } from "vitest"

import { astEquals, canonicalizeAst, identityAst, mergeAstAnd } from "~/features/search"
import type { ParseNode } from "~/lib/api"

import { arbAst } from "../../arbitraries/parse-node"

const canonEquals = (a: ParseNode, b: ParseNode): boolean =>
  astEquals(canonicalizeAst(a), canonicalizeAst(b))

describe("mergeAstAnd laws", () => {
  test.prop([arbAst, arbAst, arbAst])(
    "mergeAstAnd_associative",
    (a, b, c) => {
      const left = mergeAstAnd(mergeAstAnd(a, b), c)
      const right = mergeAstAnd(a, mergeAstAnd(b, c))
      expect(canonEquals(left, right)).toBe(true)
    },
  )

  test.prop([arbAst])(
    "mergeAstAnd_identityLeft",
    (a) => {
      expect(canonEquals(mergeAstAnd(identityAst, a), a)).toBe(true)
    },
  )

  test.prop([arbAst])(
    "mergeAstAnd_identityRight",
    (a) => {
      expect(canonEquals(mergeAstAnd(a, identityAst), a)).toBe(true)
    },
  )

  test("mergeAstAnd_empty_returnsIdentity", () => {
    expect(astEquals(mergeAstAnd(), identityAst)).toBe(true)
  })

  test.prop([fc.array(arbAst, { minLength: 1, maxLength: 5 })], { numRuns: 50 })(
    "mergeAstAnd_flattensNestedAnd",
    (nodes) => {
      const merged = mergeAstAnd(...nodes)
      if (merged.op === "AND") {
        for (const child of merged.rules) {
          expect(child.op).not.toBe("AND")
        }
      }
    },
  )
})
