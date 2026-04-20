import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import {
  ALL_DB_VALUE,
  buildSearchUrl,
  buildSearchUrlFull,
  type DbSelectValue,
  DEFAULT_PAGE,
  DEFAULT_PER_PAGE,
  DEFAULT_SORT,
  parseSearchUrl,
  PER_PAGE_VALUES,
  type PerPageValue,
  SORT_VALUES,
  type SortValue,
} from "@/lib/search-url"
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

describe("buildSearchUrlFull", () => {

  it("returns /search when no params given", () => {
    expect(buildSearchUrlFull({})).toBe("/search")
  })

  it("preserves order q → db → page → perPage → sort → cursor → adv", () => {
    const url = buildSearchUrlFull({
      adv: "title:cancer",
      cursor: "abc",
      db: "sra",
      page: 2,
      perPage: 50,
      q: "human",
      sort: "date_desc",
    })
    const qp = url.slice("/search?".length)
    const keys = [...new URLSearchParams(qp).keys()]
    expect(keys).toEqual(["q", "db", "page", "perPage", "sort", "cursor", "adv"])
  })

  it("omits default values (page=1, perPage=20, sort=relevance, db=all)", () => {
    const url = buildSearchUrlFull({
      db: ALL_DB_VALUE,
      page: DEFAULT_PAGE,
      perPage: DEFAULT_PER_PAGE,
      q: "xxx",
      sort: DEFAULT_SORT,
    })
    expect(url).toBe("/search?q=xxx")
  })

  it("includes non-default page/perPage/sort", () => {
    const url = buildSearchUrlFull({ page: 3, perPage: 50, q: "xxx", sort: "date_asc" })
    const params = new URLSearchParams(url.slice("/search?".length))
    expect(params.get("page")).toBe("3")
    expect(params.get("perPage")).toBe("50")
    expect(params.get("sort")).toBe("date_asc")
  })
})

describe("parseSearchUrl", () => {

  const parse = (qs: string) => parseSearchUrl(new URLSearchParams(qs))

  it("redirects to home when neither q nor adv are given", () => {
    const result = parse("")
    expect(result.shouldRedirectToHome).toBe(true)
    expect(result.params.q).toBeNull()
    expect(result.params.adv).toBeNull()
  })

  it("marks both_q_and_adv when both q and adv are present", () => {
    const result = parse("q=human&adv=title%3Acancer")
    expect(result.softErrors).toContain("both_q_and_adv")
    expect(result.params.q).toBe("human")
    expect(result.params.adv).toBe("title:cancer")
    expect(result.shouldRedirectToHome).toBe(false)
  })

  it("silently falls back db=invalid to ALL_DB_VALUE", () => {
    const result = parse("q=human&db=not_a_db")
    expect(result.params.db).toBe(ALL_DB_VALUE)
  })

  it("normalizes parameter order (?db=sra&q=xxx → ?q=xxx&db=sra)", () => {
    const result = parse("db=sra&q=xxx")
    expect(result.canonicalUrl).toBe("/search?q=xxx&db=sra")
  })

  it("returns null canonicalUrl when already canonical", () => {
    const result = parse("q=xxx&db=sra")
    expect(result.canonicalUrl).toBeNull()
  })

  it("trims whitespace-only q to null", () => {
    const result = parse("q=%20%20&adv=title%3Acancer")
    expect(result.params.q).toBeNull()
    expect(result.params.adv).toBe("title:cancer")
  })

  it("silently falls back invalid page to DEFAULT_PAGE", () => {
    expect(parse("q=x&page=0").params.page).toBe(DEFAULT_PAGE)
    expect(parse("q=x&page=-5").params.page).toBe(DEFAULT_PAGE)
    expect(parse("q=x&page=abc").params.page).toBe(DEFAULT_PAGE)
    expect(parse("q=x&page=1.5").params.page).toBe(DEFAULT_PAGE)
  })

  it("silently falls back invalid perPage to DEFAULT_PER_PAGE", () => {
    expect(parse("q=x&perPage=17").params.perPage).toBe(DEFAULT_PER_PAGE)
    expect(parse("q=x&perPage=abc").params.perPage).toBe(DEFAULT_PER_PAGE)
    expect(parse("q=x&perPage=200").params.perPage).toBe(DEFAULT_PER_PAGE)
  })

  it("silently falls back invalid sort to DEFAULT_SORT", () => {
    expect(parse("q=x&sort=invalid").params.sort).toBe(DEFAULT_SORT)
    expect(parse("q=x&sort=DATE_DESC").params.sort).toBe(DEFAULT_SORT)
  })

  it("preserves cursor as opaque string", () => {
    expect(parse("q=x&cursor=abc123%3D%3D").params.cursor).toBe("abc123==")
    expect(parse("q=x&cursor=").params.cursor).toBeNull()
  })

  it("PBT: does not throw for any URLSearchParams input", () => {
    expect(() => fc.assert(
      fc.property(
        fc.dictionary(fc.string(), fc.string(), { maxKeys: 10 }),
        (dict) => {
          const sp = new URLSearchParams()
          for (const [k, v] of Object.entries(dict)) sp.set(k, v)
          expect(() => parseSearchUrl(sp)).not.toThrow()

          return true
        },
      ),
      { numRuns: 200 },
    )).not.toThrow()
  })

  it("PBT: round-trip parseSearchUrl(buildSearchUrlFull(p)) preserves values", () => {
    expect(() => fc.assert(
      fc.property(
        fc.record({
          q: fc.oneof(
            fc.constant<string | null>(null),
            fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
          ),
          adv: fc.oneof(
            fc.constant<string | null>(null),
            fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0),
          ),
          db: fc.constantFrom<DbSelectValue>(...DB_VALUES),
          page: fc.integer({ max: 9999, min: 1 }),
          perPage: fc.constantFrom<PerPageValue>(...PER_PAGE_VALUES),
          sort: fc.constantFrom<SortValue>(...SORT_VALUES),
          cursor: fc.oneof(fc.constant<string | null>(null), fc.string({ minLength: 1 })),
        }),
        (p) => {
          // skip invalid input: neither q nor adv
          if (p.q === null && p.adv === null) return true
          const url = buildSearchUrlFull(p)
          const qs = url.slice("/search?".length)
          const parsed = parseSearchUrl(new URLSearchParams(qs))
          expect(parsed.params.q).toBe(p.q === null ? null : p.q.trim())
          expect(parsed.params.adv).toBe(p.adv === null ? null : p.adv.trim())
          expect(parsed.params.db).toBe(p.db)
          expect(parsed.params.page).toBe(p.page)
          expect(parsed.params.perPage).toBe(p.perPage)
          expect(parsed.params.sort).toBe(p.sort)

          return true
        },
      ),
      { numRuns: 200 },
    )).not.toThrow()
  })

  it("PBT: invalid page always falls back to DEFAULT_PAGE", () => {
    const invalidPage = fc.oneof(
      fc.integer({ max: 0 }).map(String),
      fc.string().filter((s) => !/^\d+$/.test(s) && s !== ""),
    )
    expect(() => fc.assert(
      fc.property(invalidPage, (pageRaw) => {
        const result = parseSearchUrl(new URLSearchParams(`q=x&page=${encodeURIComponent(pageRaw)}`))

        return result.params.page === DEFAULT_PAGE
      }),
      { numRuns: 200 },
    )).not.toThrow()
  })

  it("PBT: invalid perPage always falls back to DEFAULT_PER_PAGE", () => {
    const invalidPerPage = fc.oneof(
      fc.integer().filter((n) => !([20, 50, 100] as number[]).includes(n)).map(String),
      fc.string().filter((s) => s !== "20" && s !== "50" && s !== "100"),
    )
    expect(() => fc.assert(
      fc.property(invalidPerPage, (raw) => {
        const result = parseSearchUrl(new URLSearchParams(`q=x&perPage=${encodeURIComponent(raw)}`))

        return result.params.perPage === DEFAULT_PER_PAGE
      }),
      { numRuns: 200 },
    )).not.toThrow()
  })

  it("PBT: invalid sort always falls back to DEFAULT_SORT", () => {
    const invalidSort = fc.string().filter(
      (s) => s !== "relevance" && s !== "date_desc" && s !== "date_asc",
    )
    expect(() => fc.assert(
      fc.property(invalidSort, (raw) => {
        const result = parseSearchUrl(new URLSearchParams(`q=x&sort=${encodeURIComponent(raw)}`))

        return result.params.sort === DEFAULT_SORT
      }),
      { numRuns: 200 },
    )).not.toThrow()
  })

  it("PBT: canonicalUrl is idempotent (re-parsing canonical returns null)", () => {
    expect(() => fc.assert(
      fc.property(
        fc.record({
          q: fc.option(fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0), { nil: null as never }),
          adv: fc.option(fc.string({ minLength: 1 }).filter((s) => s.trim().length > 0), { nil: null as never }),
          db: fc.constantFrom<DbSelectValue>(...DB_VALUES),
          page: fc.integer({ max: 9999, min: 1 }),
          perPage: fc.constantFrom<PerPageValue>(...PER_PAGE_VALUES),
          sort: fc.constantFrom<SortValue>(...SORT_VALUES),
        }),
        (p) => {
          if (p.q === null && p.adv === null) return true
          const canonical = buildSearchUrlFull(p)
          const reparse = parseSearchUrl(new URLSearchParams(canonical.slice("/search?".length)))

          return reparse.canonicalUrl === null
        },
      ),
      { numRuns: 200 },
    )).not.toThrow()
  })
})
