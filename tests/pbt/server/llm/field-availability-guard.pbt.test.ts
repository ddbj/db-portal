import fc from "fast-check"
import { describe, expect, test } from "vitest"

import { pruneUnavailableFields, UNAVAILABLE_BY_DB } from "../../../../server/llm/assistant/field-availability-guard"

// Cross fields each DB DOES serve, used to build queries that mix supported and
// unsupported clauses. Disjoint from UNAVAILABLE_BY_DB[db] by construction.
const AVAILABLE: Record<string, string[]> = {
  taxonomy: ["rank", "common_name", "genus", "lineage", "domain", "organism_id"],
  trad: ["division", "molecular_type", "feature_gene_name", "date_published", "organism_name"],
  biosample: ["host", "strain", "isolate", "geo_loc_name", "date_created", "organism_name"],
}

const dbArb = fc.constantFrom("taxonomy", "trad", "biosample")

// Build a flat `field:value` AND-chain. Unique values (a<i> / u<i>) keep substring
// checks unambiguous; the booleans decide which positions are unsupported.
const buildDsl = (db: string, positions: boolean[]): { dsl: string; conjuncts: string[] } => {
  const avail = AVAILABLE[db]!
  const unavail = [...UNAVAILABLE_BY_DB[db]!]
  const conjuncts = positions.map((unsupported, i) =>
    unsupported ? `${unavail[i % unavail.length]}:u${i}` : `${avail[i % avail.length]}:a${i}`)

  return { dsl: conjuncts.join(" AND "), conjuncts }
}

describe("pruneUnavailableFields (PBT)", () => {
  test("idempotent: pruning the result never finds anything left to prune", () => {
    fc.assert(fc.property(dbArb, fc.array(fc.boolean(), { minLength: 1, maxLength: 8 }), (db, positions) => {
      const { dsl } = buildDsl(db, positions)
      const once = pruneUnavailableFields(dsl, db)
      const twice = once === null ? null : pruneUnavailableFields(once, db)
      expect(twice).toBeNull()
    }))
  })

  test("a query using only supported fields is never rewritten", () => {
    fc.assert(fc.property(dbArb, fc.array(fc.constant(false), { minLength: 1, maxLength: 8 }), (db, positions) => {
      const { dsl } = buildDsl(db, positions)
      expect(pruneUnavailableFields(dsl, db)).toBeNull()
    }))
  })

  test("mixed query: keeps every supported conjunct and drops every unsupported one", () => {
    fc.assert(fc.property(
      dbArb,
      fc.integer({ min: 1, max: 5 }),
      fc.integer({ min: 1, max: 5 }),
      (db, supported, unsupported) => {
        // supported positions first, then unsupported — guarantees at least one of each.
        const positions = [...Array(supported).fill(false), ...Array(unsupported).fill(true)]
        const { dsl, conjuncts } = buildDsl(db, positions)
        const result = pruneUnavailableFields(dsl, db) ?? ""
        const keptExpected = conjuncts.filter((_, i) => !positions[i])
        const droppedExpected = conjuncts.filter((_, i) => positions[i])

        // every supported conjunct survives, no unsupported conjunct does.
        expect(keptExpected.filter((c) => !result.includes(c))).toEqual([])
        expect(droppedExpected.filter((c) => result.includes(c))).toEqual([])
      },
    ))
  })

  test("a quoted value containing AND is never split apart", () => {
    fc.assert(fc.property(dbArb, fc.boolean(), (db, leadUnsupported) => {
      const unavail = [...UNAVAILABLE_BY_DB[db]!][0]!
      const avail = AVAILABLE[db]![0]!
      // The supported clause carries an embedded AND inside quotes; it must survive whole.
      const quoted = `${avail}:"alpha AND omega"`
      const dropped = `${unavail}:x`
      const dsl = leadUnsupported ? `${dropped} AND ${quoted}` : `${quoted} AND ${dropped}`
      expect(pruneUnavailableFields(dsl, db)).toBe(quoted)
    }))
  })

  test("a DB that serves all cross fields (or cross scope) is never rewritten", () => {
    fc.assert(fc.property(fc.constantFrom("sra", "bioproject", "jga", "gea", "metabobank"), fc.string(), (db, dsl) => {
      expect(pruneUnavailableFields(dsl, db)).toBeNull()
      expect(pruneUnavailableFields(dsl, null)).toBeNull()
    }))
  })
})
