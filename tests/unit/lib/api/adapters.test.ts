import fc from "fast-check"
import { describe, expect, it } from "vitest"

import { apiCountsToHitCounts, mapTypeToDbId } from "@/lib/api/adapters"
import type {
  DbPortalCount,
  DbPortalLightweightHit,
} from "@/lib/api/client"
import { DB_ORDER, type DbId } from "@/types/db"

const lightweightHit = (
  identifier: string,
  type: DbPortalLightweightHit["type"],
  overrides: Partial<DbPortalLightweightHit> = {},
): DbPortalLightweightHit => ({
  identifier,
  type,
  title: `${identifier} title`,
  description: null,
  organism: null,
  status: "public",
  accessibility: "public-access",
  dateCreated: null,
  dateModified: null,
  datePublished: "2024-01-01",
  url: `https://example.org/${identifier}`,
  isPartOf: type,
  ...overrides,
})

describe("mapTypeToDbId", () => {
  it("maps Solr-backed literals", () => {
    expect(mapTypeToDbId("trad")).toBe<DbId>("trad")
    expect(mapTypeToDbId("taxonomy")).toBe<DbId>("taxonomy")
  })

  it("maps ES-backed simple types", () => {
    expect(mapTypeToDbId("bioproject")).toBe<DbId>("bioproject")
    expect(mapTypeToDbId("biosample")).toBe<DbId>("biosample")
    expect(mapTypeToDbId("gea")).toBe<DbId>("gea")
    expect(mapTypeToDbId("metabobank")).toBe<DbId>("metabobank")
  })

  it("collapses sra-* sub-types into 'sra'", () => {
    for (const sub of ["sra-submission", "sra-study", "sra-experiment", "sra-run", "sra-sample", "sra-analysis"]) {
      expect(mapTypeToDbId(sub)).toBe<DbId>("sra")
    }
  })

  it("collapses jga-* sub-types into 'jga'", () => {
    for (const sub of ["jga-study", "jga-dataset", "jga-dac", "jga-policy"]) {
      expect(mapTypeToDbId(sub)).toBe<DbId>("jga")
    }
  })
})

describe("apiCountsToHitCounts", () => {
  it("returns 8 entries in DB_ORDER even when input is empty", () => {
    const result = apiCountsToHitCounts([])
    expect(result).toHaveLength(8)
    expect(result.map((r) => r.dbId)).toEqual([...DB_ORDER])
    for (const entry of result) {
      expect(entry.state).toBe("error")
      expect(entry.count).toBeNull()
      expect(entry.error).toBe("unknown")
    }
  })

  it("preserves count and topHits on success", () => {
    const input: readonly DbPortalCount[] = [
      {
        db: "bioproject",
        count: 1234,
        error: null,
        hits: [
          lightweightHit("PRJDB1", "bioproject"),
          lightweightHit("PRJDB2", "bioproject"),
        ],
      },
    ]
    const out = apiCountsToHitCounts(input)
    const bp = out.find((e) => e.dbId === "bioproject")
    if (bp === undefined) throw new Error("missing bioproject")
    expect(bp.state).toBe("success")
    expect(bp.count).toBe(1234)
    expect(bp.topHits).toHaveLength(2)
    expect(bp.topHits?.[0]?.identifier).toBe("PRJDB1")
  })

  it("omits topHits when hits is null (count-only mode)", () => {
    const input: readonly DbPortalCount[] = [
      { db: "trad", count: 10, error: null, hits: null },
    ]
    const out = apiCountsToHitCounts(input)
    const trad = out.find((e) => e.dbId === "trad")
    if (trad === undefined) throw new Error("missing trad")
    expect(trad.state).toBe("success")
    expect(trad.topHits).toBeUndefined()
  })

  it("omits topHits when hits is undefined", () => {
    const input: readonly DbPortalCount[] = [
      { db: "sra", count: 99, error: null },
    ]
    const out = apiCountsToHitCounts(input)
    const sra = out.find((e) => e.dbId === "sra")
    if (sra === undefined) throw new Error("missing sra")
    expect(sra.state).toBe("success")
    expect(sra.topHits).toBeUndefined()
  })

  it("treats per-DB error and drops hits", () => {
    const input: readonly DbPortalCount[] = [
      { db: "biosample", count: null, error: "timeout", hits: [] },
    ]
    const out = apiCountsToHitCounts(input)
    const bs = out.find((e) => e.dbId === "biosample")
    if (bs === undefined) throw new Error("missing biosample")
    expect(bs.state).toBe("error")
    expect(bs.count).toBeNull()
    expect(bs.error).toBe("timeout")
    expect(bs.topHits).toBeUndefined()
  })

  it("normalizes count=null on success to 0 (defensive against API edge case)", () => {
    const input: readonly DbPortalCount[] = [
      { db: "gea", count: null, error: null, hits: null },
    ]
    const out = apiCountsToHitCounts(input)
    const gea = out.find((e) => e.dbId === "gea")
    if (gea === undefined) throw new Error("missing gea")
    expect(gea.state).toBe("success")
    expect(gea.count).toBe(0)
  })

  describe("PBT", () => {
    const dbArb = fc.constantFrom(...DB_ORDER)

    it("output length is always 8 and dbId order matches DB_ORDER", () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              db: dbArb,
              count: fc.option(fc.integer({ min: 0, max: 1_000_000 }), { nil: null }),
              error: fc.option(
                fc.constantFrom("timeout", "upstream_5xx", "connection_refused", "unknown"),
                { nil: null },
              ),
            }),
            { maxLength: 16 },
          ),
          (arr) => {
            const out = apiCountsToHitCounts(arr as readonly DbPortalCount[])
            expect(out).toHaveLength(8)
            expect(out.map((e) => e.dbId)).toEqual([...DB_ORDER])
          },
        ),
      )
    })

    it("when error is non-null on the first matching entry, state=error and topHits is omitted", () => {
      fc.assert(
        fc.property(
          dbArb,
          fc.constantFrom("timeout", "upstream_5xx", "connection_refused", "unknown"),
          (db, errKind) => {
            const input: readonly DbPortalCount[] = [
              { db, count: null, error: errKind, hits: [] },
            ]
            const out = apiCountsToHitCounts(input)
            const entry = out.find((e) => e.dbId === db)
            if (entry === undefined) throw new Error("missing entry")
            expect(entry.state).toBe("error")
            expect(entry.error).toBe(errKind)
            expect(entry.topHits).toBeUndefined()
          },
        ),
      )
    })
  })
})
