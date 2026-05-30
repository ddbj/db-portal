import fc from "fast-check"
import { describe, expect, it } from "vitest"

import {
  canonicalizeAst,
  createCondition,
  createInitialSearchFacetState,
  fromAdvanced,
  fromSidebar,
  type SearchFacetState,
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

const sorted = (values: readonly string[]): string[] => [...values].sort()

// Non-blank token (no surrounding whitespace, so fromSidebar's trim is identity).
const tokenArb = fc.string({ minLength: 1, maxLength: 8 })
  .map((s) => s.replace(/\s/g, "x"))
  .filter((s) => s.length > 0)

// Organisms are tracked as NCBI taxonomy IDs emitted as `organism_id:<taxID>`.
const taxIdArb = fc.constantFrom("9606", "10090", "562", "7227")
const objectTypeArb = fc.constantFrom("BioProject", "UmbrellaBioProject")

const bioprojectStateArb = fc.record({
  organism: fc.uniqueArray(taxIdArb, { maxLength: 3 }),
  objectType: fc.uniqueArray(objectTypeArb, { maxLength: 2 }),
  submitter: fc.option(tokenArb, { nil: "" }),
}).map(({ organism, objectType, submitter }): { state: SearchFacetState; submitter: string } => ({
  state: {
    ...createInitialSearchFacetState(),
    facets: { organism, objectType },
    ...(submitter === "" ? {} : { texts: { submitter } }),
  },
  submitter,
}))

describe("sidebar round-trip", () => {
  it("fromSidebar→splitForSidebar recovers facets and text for the scope", () => {
    fc.assert(
      fc.property(bioprojectStateArb, ({ state, submitter }) => {
        const ast = fromSidebar(state, { db: "bioproject" })
        const { sidebar } = splitForSidebar(ast, "bioproject")
        expect(sorted(sidebar.facets.organism ?? [])).toEqual(sorted(state.facets.organism ?? []))
        expect(sorted(sidebar.facets.objectType ?? [])).toEqual(sorted(state.facets.objectType ?? []))
        expect(sidebar.texts.submitter ?? "").toEqual(submitter)
      }),
    )
  })
})
