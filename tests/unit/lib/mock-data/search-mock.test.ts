import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import {
  classifyMockQuery,
  dbHitCountQueryFn,
  ERROR_KIND_FOR_PARTIAL,
  getResultsByDb,
  isHardLimitReached,
  MOCK_TOTAL_COUNTS,
  MockError,
  searchResultsQueryFn,
} from "@/lib/mock-data"
import { DB_ORDER, type DbId } from "@/types/db"

const DB_IDS: readonly DbId[] = DB_ORDER

describe("classifyMockQuery", () => {

  it("returns 'normal' for null", () => {
    expect(classifyMockQuery(null)).toBe("normal")
  })

  it("returns 'normal' for regular queries", () => {
    expect(classifyMockQuery("human")).toBe("normal")
    expect(classifyMockQuery("Homo sapiens")).toBe("normal")
    expect(classifyMockQuery("")).toBe("normal")
  })

  it("detects each special prefix", () => {
    expect(classifyMockQuery("__loading__")).toBe("loading")
    expect(classifyMockQuery("__error__")).toBe("error")
    expect(classifyMockQuery("__partial__")).toBe("partial")
    expect(classifyMockQuery("__empty__")).toBe("empty")
  })

  it("detects special prefix with trailing text", () => {
    expect(classifyMockQuery("__error__ extra")).toBe("error")
    expect(classifyMockQuery("  __partial__  ")).toBe("partial")
  })

  it("PBT: never throws for arbitrary strings", () => {
    expect(() => fc.assert(
      fc.property(fc.string(), (s) => {
        expect(() => classifyMockQuery(s)).not.toThrow()

        return true
      }),
      { numRuns: 200 },
    )).not.toThrow()
  })
})

describe("isHardLimitReached", () => {

  it("returns false for ES-backed DBs at any page", () => {
    expect(isHardLimitReached("bioproject", 999, 20)).toBe(false)
    expect(isHardLimitReached("sra", 10_000, 20)).toBe(false)
  })

  it("returns true for Solr DBs beyond 10,000 / perPage", () => {
    expect(isHardLimitReached("trad", 500, 20)).toBe(true)
    expect(isHardLimitReached("taxonomy", 500, 20)).toBe(true)
  })

  it("returns false for Solr DBs below the hard limit", () => {
    expect(isHardLimitReached("trad", 499, 20)).toBe(false)
    expect(isHardLimitReached("taxonomy", 99, 100)).toBe(false)
  })

  it("scales with perPage", () => {
    expect(isHardLimitReached("trad", 200, 50)).toBe(true)
    expect(isHardLimitReached("trad", 100, 100)).toBe(true)
    expect(isHardLimitReached("trad", 99, 100)).toBe(false)
  })
})

describe("dbHitCountQueryFn — normal modality", () => {

  it("returns MOCK_TOTAL_COUNTS[dbId] for each DB", async () => {
    for (const dbId of DB_IDS) {
      const result = await dbHitCountQueryFn(dbId, "human", null)
      expect(result).toEqual({ dbId, count: MOCK_TOTAL_COUNTS[dbId] })
    }
  })

  it("works with adv only", async () => {
    const result = await dbHitCountQueryFn("bioproject", null, "title:cancer")
    expect(result.count).toBe(MOCK_TOTAL_COUNTS.bioproject)
  })
})

describe("dbHitCountQueryFn — error modality", () => {

  it("rejects with MockError for __error__", async () => {
    await expect(dbHitCountQueryFn("bioproject", "__error__", null))
      .rejects.toBeInstanceOf(MockError)
  })

  it("error kind is upstream_5xx", async () => {
    await expect(dbHitCountQueryFn("bioproject", "__error__", null))
      .rejects.toMatchObject({ kind: "upstream_5xx" })
  })
})

describe("dbHitCountQueryFn — partial modality", () => {

  const erroringDbs = DB_IDS.filter((id) => ERROR_KIND_FOR_PARTIAL[id] !== null)
  const succeedingDbs = DB_IDS.filter((id) => ERROR_KIND_FOR_PARTIAL[id] === null)

  it.each(erroringDbs)("rejects for %s", async (dbId) => {
    await expect(dbHitCountQueryFn(dbId, "__partial__", null))
      .rejects.toBeInstanceOf(MockError)
  })

  it.each(succeedingDbs)("resolves for %s with MOCK_TOTAL_COUNTS", async (dbId) => {
    await expect(dbHitCountQueryFn(dbId, "__partial__", null))
      .resolves.toEqual({ dbId, count: MOCK_TOTAL_COUNTS[dbId] })
  })

  it("has at least one erroring and one succeeding DB", () => {
    expect(erroringDbs.length).toBeGreaterThanOrEqual(1)
    expect(succeedingDbs.length).toBeGreaterThanOrEqual(1)
  })
})

describe("dbHitCountQueryFn — empty modality", () => {

  it("resolves with count 0 for all DBs", async () => {
    for (const dbId of DB_IDS) {
      const r = await dbHitCountQueryFn(dbId, "__empty__", null)
      expect(r.count).toBe(0)
    }
  })
})

describe("dbHitCountQueryFn — loading modality", () => {

  it("returns a pending promise that does not resolve within 30ms", async () => {
    const p = dbHitCountQueryFn("bioproject", "__loading__", null)
    const winner = await Promise.race([
      p.then(() => "RESOLVED"),
      new Promise<string>((resolve) => { setTimeout(() => resolve("PENDING"), 30) }),
    ])
    expect(winner).toBe("PENDING")
  })
})

describe("searchResultsQueryFn", () => {

  it("returns hits and total for normal queries", async () => {
    const r = await searchResultsQueryFn({
      q: "human",
      adv: null,
      db: "bioproject",
      page: 1,
      perPage: 20,
      sort: "relevance",
    })
    expect(r.total).toBe(MOCK_TOTAL_COUNTS.bioproject)
    expect(r.hits.length).toBeGreaterThan(0)
    expect(r.hits.length).toBeLessThanOrEqual(20)
    expect(r.hardLimitReached).toBe(false)
  })

  it("all hits belong to the requested db", async () => {
    const r = await searchResultsQueryFn({
      q: "x",
      adv: null,
      db: "sra",
      page: 1,
      perPage: 20,
      sort: "relevance",
    })
    for (const hit of r.hits) {
      expect(hit.dbId).toBe("sra")
    }
  })

  it("slices correctly with page/perPage", async () => {
    const base = getResultsByDb("bioproject")
    const page1 = await searchResultsQueryFn({
      q: "x",
      adv: null,
      db: "bioproject",
      page: 1,
      perPage: 20,
      sort: "relevance",
    })
    expect(page1.hits.length).toBe(Math.min(20, base.length))
    const page2 = await searchResultsQueryFn({
      q: "x",
      adv: null,
      db: "bioproject",
      page: 2,
      perPage: 20,
      sort: "relevance",
    })
    expect(page2.hits.length).toBe(Math.min(20, Math.max(0, base.length - 20)))
    // page 1 と page 2 は重複しない
    const ids1 = new Set(page1.hits.map((h) => h.identifier))
    for (const hit of page2.hits) {
      expect(ids1.has(hit.identifier)).toBe(false)
    }
  })

  it("sorts date_desc correctly", async () => {
    const r = await searchResultsQueryFn({
      q: "x",
      adv: null,
      db: "bioproject",
      page: 1,
      perPage: 20,
      sort: "date_desc",
    })
    for (let i = 0; i < r.hits.length - 1; i++) {
      const a = r.hits[i]?.publishedAt ?? ""
      const b = r.hits[i + 1]?.publishedAt ?? ""
      expect(a >= b).toBe(true)
    }
  })

  it("sorts date_asc correctly", async () => {
    const r = await searchResultsQueryFn({
      q: "x",
      adv: null,
      db: "bioproject",
      page: 1,
      perPage: 20,
      sort: "date_asc",
    })
    for (let i = 0; i < r.hits.length - 1; i++) {
      const a = r.hits[i]?.publishedAt ?? ""
      const b = r.hits[i + 1]?.publishedAt ?? ""
      expect(a <= b).toBe(true)
    }
  })

  it("returns empty results for __empty__", async () => {
    const r = await searchResultsQueryFn({
      q: "__empty__",
      adv: null,
      db: "bioproject",
      page: 1,
      perPage: 20,
      sort: "relevance",
    })
    expect(r.total).toBe(0)
    expect(r.hits).toEqual([])
  })

  it("throws MockError for __error__", async () => {
    await expect(searchResultsQueryFn({
      q: "__error__",
      adv: null,
      db: "bioproject",
      page: 1,
      perPage: 20,
      sort: "relevance",
    })).rejects.toBeInstanceOf(MockError)
  })

  it("sets hardLimitReached for Solr DBs beyond 10k", async () => {
    const r = await searchResultsQueryFn({
      q: "x",
      adv: null,
      db: "trad",
      page: 500,
      perPage: 20,
      sort: "relevance",
    })
    expect(r.hardLimitReached).toBe(true)
  })

  it("does not set hardLimitReached for ES-backed DBs", async () => {
    const r = await searchResultsQueryFn({
      q: "x",
      adv: null,
      db: "bioproject",
      page: 999,
      perPage: 20,
      sort: "relevance",
    })
    expect(r.hardLimitReached).toBe(false)
  })
})
