import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import { ALL_DB_VALUE, buildSearchUrl, type DbSelectValue } from "@/lib/search-url"
import { DB_ORDER } from "@/types/db"

const DB_VALUES: readonly DbSelectValue[] = [ALL_DB_VALUE, ...DB_ORDER]

describe("buildSearchUrl", () => {

  it("returns /search when both q and db are empty/all", () => {
    expect(buildSearchUrl({ q: "", db: ALL_DB_VALUE })).toBe("/search")
  })

  it("omits q when it is whitespace-only", () => {
    expect(buildSearchUrl({ q: "   ", db: ALL_DB_VALUE })).toBe("/search")
  })

  it("omits db param when db is the all sentinel", () => {
    const url = buildSearchUrl({ q: "SARS-CoV-2", db: ALL_DB_VALUE })
    expect(url).toBe("/search?q=SARS-CoV-2")
    expect(url).not.toContain("db=")
  })

  it("includes db param for a specific DB", () => {
    const url = buildSearchUrl({ q: "Homo sapiens", db: "sra" })
    expect(url).toBe("/search?q=Homo+sapiens&db=sra")
  })

  it("trims leading/trailing whitespace from q", () => {
    expect(buildSearchUrl({ q: "  E. coli  ", db: "biosample" }))
      .toBe("/search?q=E.+coli&db=biosample")
  })

  it("PBT: every output URL starts with /search", () => {
    expect(() => fc.assert(
      fc.property(
        fc.string(),
        fc.constantFrom(...DB_VALUES),
        (q, db) => buildSearchUrl({ q, db }).startsWith("/search"),
      ),
      { numRuns: 200 },
    )).not.toThrow()
  })

  it("PBT: q with trimmed non-empty value round-trips via URLSearchParams", () => {
    expect(() => fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.constantFrom(...DB_VALUES),
        (q, db) => {
          const url = buildSearchUrl({ q, db })
          const searchIndex = url.indexOf("?")
          if (searchIndex === -1) return false
          const params = new URLSearchParams(url.slice(searchIndex + 1))

          return params.get("q") === q.trim()
        },
      ),
      { numRuns: 200 },
    )).not.toThrow()
  })

  it("PBT: db=all sentinel never appears as a db query param", () => {
    expect(() => fc.assert(
      fc.property(
        fc.string(),
        (q) => {
          const url = buildSearchUrl({ q, db: ALL_DB_VALUE })

          return !url.includes("db=")
        },
      ),
      { numRuns: 100 },
    )).not.toThrow()
  })

  it("PBT: specific DB id always appears as db=<id>", () => {
    expect(() => fc.assert(
      fc.property(
        fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
        fc.constantFrom(...DB_ORDER),
        (q, db) => {
          const url = buildSearchUrl({ q, db })
          const searchIndex = url.indexOf("?")
          if (searchIndex === -1) return false
          const params = new URLSearchParams(url.slice(searchIndex + 1))

          return params.get("db") === db
        },
      ),
      { numRuns: 200 },
    )).not.toThrow()
  })

  it("PBT: empty-trimmed q never appears in the URL", () => {
    expect(() => fc.assert(
      fc.property(
        fc.string().filter((s) => s.trim().length === 0),
        fc.constantFrom(...DB_VALUES),
        (q, db) => {
          const url = buildSearchUrl({ q, db })

          return !url.includes("q=")
        },
      ),
      { numRuns: 100 },
    )).not.toThrow()
  })
})
