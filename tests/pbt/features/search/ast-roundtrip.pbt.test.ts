import { test } from "@fast-check/vitest"
import { describe, expect } from "vitest"

import {
  astEquals,
  canonicalizeAst,
  fromAdvanced,
  fromSidebar,
  splitForSidebar,
  toAdvanced,
} from "~/features/search"
import type { ParseNode } from "~/lib/api"

import { arbLeafForAdvanced, arbLeafForSidebar } from "../../arbitraries/parse-node"

const canonEquals = (a: ParseNode, b: ParseNode): boolean =>
  astEquals(canonicalizeAst(a), canonicalizeAst(b))

describe("AST round-trip", () => {
  test.prop([arbLeafForAdvanced], { numRuns: 50 })(
    "advanced_roundtrip_singleLeaf",
    (leaf) => {
      const advanced = toAdvanced(leaf)
      const back = fromAdvanced(advanced)
      expect(canonEquals(back, leaf)).toBe(true)
    },
  )

  test.prop([arbLeafForSidebar], { numRuns: 50 })(
    "sidebar_split_roundtrip_singleLeaf",
    (leaf) => {
      const split = splitForSidebar(leaf)
      const back = fromSidebar(split.sidebar, { db: "bioproject" })
      expect(canonEquals(back, leaf)).toBe(true)
    },
  )
})
