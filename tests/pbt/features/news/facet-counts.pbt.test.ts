import { test } from "@fast-check/vitest"
import fc from "fast-check"
import { describe, expect } from "vitest"

import {
  collectNewsFacetCounts,
  emptyNewsFacetState,
  type NewsFacetState,
} from "~/features/news"
import { NewsCategory, type NewsItem, NewsSource } from "~/lib/api"

const DB_POOL = ["a", "b", "c"]
const DATE_POOL = [
  "2022-01-01T00:00:00+09:00",
  "2023-06-15T00:00:00+09:00",
  "2024-12-31T00:00:00+09:00",
  "not-a-date",
]

const arbItem: fc.Arbitrary<NewsItem> = fc
  .record({
    source: fc.constantFrom(...NewsSource.options),
    category: fc.constantFrom(...NewsCategory.options),
    publishedAt: fc.constantFrom(...DATE_POOL),
    ja: fc.constantFrom("J", ""),
    en: fc.constantFrom("E", ""),
    db: fc.subarray(DB_POOL),
  })
  .map(({ source, category, publishedAt, ja, en, db }) => ({
    id: "n",
    source,
    category,
    featured: false,
    publishedAt,
    title: { ja, en },
    db,
    rawTags: { ja: [], en: [] },
  }))

const arbItems = fc.array(arbItem, { maxLength: 40 })
const arbLang = fc.constantFrom("ja" as const, "en" as const)

const arbFacet: fc.Arbitrary<NewsFacetState> = fc.record({
  source: fc.subarray([...NewsSource.options]),
  category: fc.subarray([...NewsCategory.options]),
  year: fc.subarray([2022, 2023, 2024, 1999]),
  service: fc.subarray([...DB_POOL, "z"]),
  page: fc.constant(1),
  sort: fc.constant("newest" as const),
})

const GROUPS = ["source", "category", "year", "service"] as const
const sum = (record: Readonly<Record<string, number>>): number =>
  Object.values(record).reduce((acc, n) => acc + n, 0)

describe("collectNewsFacetCounts PBT", () => {
  test.prop([arbItems, arbFacet, arbLang])(
    "各グループの件数はそのグループ自身の選択に依存しない (exclude-self)",
    (items, facet, lang) => {
      const base = collectNewsFacetCounts(items, lang, facet)
      expect(collectNewsFacetCounts(items, lang, { ...facet, source: [] }).source).toEqual(base.source)
      expect(collectNewsFacetCounts(items, lang, { ...facet, category: [] }).category).toEqual(base.category)
      expect(collectNewsFacetCounts(items, lang, { ...facet, year: [] }).year).toEqual(base.year)
      expect(collectNewsFacetCounts(items, lang, { ...facet, service: [] }).service).toEqual(base.service)
    },
  )

  test.prop([arbItems, arbFacet, arbLang])(
    "他グループの絞り込みはどの件数も増やさない (monotone)",
    (items, facet, lang) => {
      const full = collectNewsFacetCounts(items, lang, emptyNewsFacetState())
      const filtered = collectNewsFacetCounts(items, lang, facet)
      for (const group of GROUPS) {
        const fullGroup = full[group] as Record<string, number>
        for (const [key, value] of Object.entries(filtered[group])) {
          expect(value).toBeLessThanOrEqual(fullGroup[key] ?? 0)
        }
      }
    },
  )

  test.prop([arbItems, arbLang])(
    "無フィルタ時の各グループ総和は valid 件数と整合する",
    (items, lang) => {
      const counts = collectNewsFacetCounts(items, lang, emptyNewsFacetState())
      const valid = items.filter((item) => item.title[lang].trim() !== "")
      expect(sum(counts.source)).toBe(valid.length)
      expect(sum(counts.category)).toBe(valid.length)
      const yearValid = valid.filter((item) =>
        Number.isInteger(Number(item.publishedAt.slice(0, 4))),
      ).length
      expect(sum(counts.year)).toBe(yearValid)
      const dbTotal = valid.reduce((acc, item) => acc + item.db.length, 0)
      expect(sum(counts.service)).toBe(dbTotal)
    },
  )

  test.prop([arbItems, arbFacet, arbLang])(
    "どの件数も非負で valid 件数を超えない",
    (items, facet, lang) => {
      const counts = collectNewsFacetCounts(items, lang, facet)
      const validLength = items.filter((item) => item.title[lang].trim() !== "").length
      for (const group of GROUPS) {
        for (const value of Object.values(counts[group])) {
          expect(value).toBeGreaterThanOrEqual(1)
          expect(value).toBeLessThanOrEqual(validLength)
        }
      }
    },
  )
})
