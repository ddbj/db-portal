import fc from "fast-check"
import { describe, expect, it } from "vitest"

import {
  canonicalizeAst,
  createCondition,
  fromAdvanced,
  fromSidebar,
  splitForSidebar,
  toAdvanced,
} from "~/features/search"

const fieldArb = fc.constantFrom("organism_name", "identifier", "title", "description")

const valueArb = fc.string({ minLength: 1, maxLength: 12 }).filter((s) => s.trim().length > 0)

const conditionArb = fieldArb.chain((field) =>
  valueArb.map((value) => createCondition({ field, value, op: field === "identifier" ? "eq" : "contains" })),
)

const stateArb = fc.array(conditionArb, { minLength: 0, maxLength: 5 }).map((conditions) => ({
  root: {
    kind: "group" as const,
    id: "advanced-root",
    combinator: "AND" as const,
    innerCombinator: "AND" as const,
    children: conditions,
  },
}))

describe("advanced AST round-trip", () => {
  it("fromAdvanced→toAdvanced preserves canonical conditions", () => {
    fc.assert(
      fc.property(stateArb, (state) => {
        const ast = fromAdvanced(state)
        const back = toAdvanced(ast)
        const reAst = fromAdvanced(back)
        expect(canonicalizeAst(reAst)).toEqual(canonicalizeAst(ast))
      }),
    )
  })
})

// Organisms are tracked as NCBI taxonomy IDs and emitted as `organism_id:<taxID>`.
const sidebarStateArb = fc.record({
  organisms: fc.array(fc.constantFrom("9606", "10090", "562"), { maxLength: 3 }),
  submitters: fc.array(fc.constantFrom("RIKEN", "The University of Tokyo"), { maxLength: 2 }),
  studyType: fc.constantFrom(null, "Whole Genome Sequencing", "Metagenomics"),
  datePublished: fc.record({
    active: fc.constantFrom("all" as const),
    from: fc.constant(""),
    to: fc.constant(""),
  }),
})

describe("sidebar round-trip", () => {
  it("fromSidebar→splitForSidebar recovers organism taxIDs", () => {
    fc.assert(
      fc.property(sidebarStateArb, (state) => {
        const ast = fromSidebar(state)
        const { sidebar } = splitForSidebar(ast)
        expect([...sidebar.organisms].sort()).toEqual([...state.organisms].sort())
      }),
    )
  })
})
