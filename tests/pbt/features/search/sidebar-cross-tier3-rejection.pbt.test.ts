import fc from "fast-check"
import { describe, expect, it } from "vitest"

import {
  astEquals,
  DB_SLUGS,
  type DbSlug,
  type FilterRow,
  SCOPE_FILTERS,
  type SearchFacetState,
  splitForSidebar,
} from "~/features/search"
import type { ParseNode } from "~/lib/api"

// docs/search.md § Sidebar facet / docs/search-fields.md: cross scope exposes only
// the cross-safe Tier 1/2 fields. A Tier-3 field (object_type / package /
// library_strategy and the other per-DB-only fields) on the cross `q` is rejected
// by ddbj-search-api with field-not-available-in-cross-db (400), so splitForSidebar
// must never lift such a leaf into the cross sidebar.
//
// "Tier 3" is derived from facet-config (the code SSOT) rather than hardcoded: a
// row is Tier-3 for a per-DB scope when its DSL field is absent from the cross
// scope's filter set. If the tier set changes in SCOPE_FILTERS, these arbitraries
// follow it automatically.
const crossDslFields = new Set(SCOPE_FILTERS.cross.map((row) => row.dslField))

const isTier3 = (row: FilterRow): boolean => !crossDslFields.has(row.dslField)

type Tier3Case = { db: DbSlug; row: FilterRow }

const tier3Cases: Tier3Case[] = DB_SLUGS.flatMap((db) =>
  SCOPE_FILTERS[db].filter(isTier3).map((row) => ({ db, row })),
)

// Guard against a vacuous suite: facet-config must actually carry per-DB-only
// fields for the cross-rejection invariant to mean anything.
if (tier3Cases.length === 0) {
  throw new Error("expected at least one Tier-3 row in SCOPE_FILTERS")
}

// Operand free of DSL metacharacters so the value survives a parse round-trip and
// stays a plain operand in every leaf kind.
const operandArb = fc.string({ minLength: 1, maxLength: 12 }).filter((s) => !/[\s:()[\]"{}^~*?/]/.test(s))

const isoDateArb = fc
  .date({
    min: new Date("2000-01-01T00:00:00Z"),
    max: new Date("2030-12-31T23:59:59Z"),
    noInvalidDate: true,
  })
  .map((d) => d.toISOString().slice(0, 10))

// Build the AST leaf a given row emits, paired with a predicate that reports
// whether that row was lifted into the sidebar state (which slot depends on kind).
const leafForRow = (
  row: FilterRow,
): fc.Arbitrary<{ leaf: ParseNode; lifted: (state: SearchFacetState) => boolean }> => {
  if (row.kind === "facet" || row.kind === "text") {
    const op = row.op === "between" ? "eq" : row.op

    return operandArb.map((value) => ({
      leaf: { op, field: row.dslField, value },
      lifted: (state) =>
        row.kind === "facet"
          ? (state.facets[row.key] ?? []).includes(value)
          : state.texts[row.key] === value,
    }))
  }

  return fc.tuple(isoDateArb, isoDateArb).map(([a, b]) => {
    const [from, to] = a <= b ? [a, b] : [b, a]
    const slot = row.kind === "dateRange" ? "dateRanges" : "ranges"

    return {
      leaf: { op: "between" as const, field: row.dslField, from, to },
      lifted: (state) => state[slot][row.key] !== undefined,
    }
  })
}

const caseArb = fc
  .constantFrom(...tier3Cases)
  .chain(({ db, row }) => leafForRow(row).map((emitted) => ({ db, row, ...emitted })))

const numRuns = 2000

describe("splitForSidebar Tier-3 cross rejection", () => {
  it("never lifts a Tier-3 leaf into the cross sidebar", () => {
    fc.assert(
      fc.property(caseArb, ({ leaf, lifted }) => {
        const { sidebar } = splitForSidebar(leaf, null)
        expect(lifted(sidebar)).toBe(false)
      }),
      { numRuns },
    )
  })

  it("keeps the un-liftable Tier-3 leaf intact in cross rest", () => {
    fc.assert(
      fc.property(caseArb, ({ leaf }) => {
        const { rest } = splitForSidebar(leaf, null)
        expect(astEquals(rest, leaf)).toBe(true)
      }),
      { numRuns },
    )
  })

  it("lifts the same Tier-3 leaf into the sidebar under its owning per-DB scope", () => {
    fc.assert(
      fc.property(caseArb, ({ db, leaf, lifted }) => {
        const { sidebar } = splitForSidebar(leaf, db)
        expect(lifted(sidebar)).toBe(true)
      }),
      { numRuns },
    )
  })

  it("does not leave a per-DB-lifted Tier-3 leaf behind in rest", () => {
    fc.assert(
      fc.property(caseArb, ({ db, leaf }) => {
        const { rest } = splitForSidebar(leaf, db)
        expect(astEquals(rest, { op: "AND", rules: [] })).toBe(true)
      }),
      { numRuns },
    )
  })
})
