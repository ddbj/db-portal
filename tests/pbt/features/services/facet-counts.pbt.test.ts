import { test } from "@fast-check/vitest"
import fc from "fast-check"
import { describe, expect } from "vitest"

import {
  collectServicesFacetCounts,
  emptyServicesFacetState,
  type ServicesFacetState,
} from "~/features/services"
import { ServiceCategory, type ServiceItem, ServiceSource } from "~/lib/api"

const arbItem: fc.Arbitrary<ServiceItem> = fc
  .record({
    source: fc.constantFrom(...ServiceSource.options),
    categories: fc.subarray([...ServiceCategory.options]),
  })
  .map(({ source, categories }) => ({
    id: "s",
    source,
    name: { ja: "n", en: "n" },
    description: { ja: "", en: "" },
    categories,
    rawCategories: [],
    featuredTop: false,
  }))

const arbItems = fc.array(arbItem, { maxLength: 40 })

const arbFacet: fc.Arbitrary<ServicesFacetState> = fc.record({
  source: fc.subarray([...ServiceSource.options]),
  category: fc.subarray([...ServiceCategory.options]),
  page: fc.constant(1),
  sort: fc.constant("asc" as const),
})

const sum = (record: Readonly<Record<string, number>>): number =>
  Object.values(record).reduce((acc, n) => acc + n, 0)

describe("collectServicesFacetCounts PBT", () => {
  test.prop([arbItems, arbFacet])(
    "各グループの件数はそのグループ自身の選択に依存しない (exclude-self)",
    (items, facet) => {
      const base = collectServicesFacetCounts(items, facet)
      expect(collectServicesFacetCounts(items, { ...facet, source: [] }).source).toEqual(base.source)
      expect(collectServicesFacetCounts(items, { ...facet, category: [] }).category).toEqual(base.category)
    },
  )

  test.prop([arbItems, arbFacet])(
    "他グループの絞り込みはどの件数も増やさない (monotone)",
    (items, facet) => {
      const full = collectServicesFacetCounts(items, emptyServicesFacetState())
      const filtered = collectServicesFacetCounts(items, facet)
      for (const group of ["source", "category"] as const) {
        for (const [key, value] of Object.entries(filtered[group])) {
          expect(value).toBeLessThanOrEqual(full[group][key] ?? 0)
        }
      }
    },
  )

  test.prop([arbItems])(
    "無フィルタ時の総和は source=件数, category=categories 総数と整合する",
    (items) => {
      const counts = collectServicesFacetCounts(items, emptyServicesFacetState())
      expect(sum(counts.source)).toBe(items.length)
      const categoryTotal = items.reduce((acc, item) => acc + item.categories.length, 0)
      expect(sum(counts.category)).toBe(categoryTotal)
    },
  )
})
