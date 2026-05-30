import { describe, expect, test } from "vitest"

import {
  collectServicesFacetCounts,
  emptyServicesFacetState,
  type ServicesFacetState,
} from "~/features/services"
import type { ServiceItem } from "~/lib/api"

const buildItem = (overrides: Partial<ServiceItem> = {}): ServiceItem => ({
  id: "s",
  source: "ddbj",
  name: { ja: "名前", en: "Name" },
  description: { ja: "", en: "" },
  categories: [],
  rawCategories: [],
  featuredTop: false,
  ...overrides,
})

const items: ServiceItem[] = [
  buildItem({ id: "1", source: "ddbj", categories: ["repository"] }),
  buildItem({ id: "2", source: "ddbj", categories: ["repository", "search"] }),
  buildItem({ id: "3", source: "ddbj", categories: ["analysis"] }),
  buildItem({ id: "4", source: "dbcls", categories: ["search"] }),
  buildItem({ id: "5", source: "dbcls", categories: ["integration", "search"] }),
]

const facetWith = (overrides: Partial<ServicesFacetState>): ServicesFacetState => ({
  ...emptyServicesFacetState(),
  ...overrides,
})

describe("collectServicesFacetCounts", () => {
  test("collectServicesFacetCounts_noFilter_tallies全件をグループ別に集計する", () => {
    const counts = collectServicesFacetCounts(items, emptyServicesFacetState())
    expect(counts.source).toEqual({ ddbj: 3, dbcls: 2 })
    expect(counts.category).toEqual({ repository: 2, search: 3, analysis: 1, integration: 1 })
  })

  test("collectServicesFacetCounts_sourceSelected_同グループのsource件数は不変", () => {
    const counts = collectServicesFacetCounts(items, facetWith({ source: ["ddbj"] }))
    expect(counts.source).toEqual({ ddbj: 3, dbcls: 2 })
  })

  test("collectServicesFacetCounts_sourceSelected_category件数はsourceで絞られる", () => {
    const counts = collectServicesFacetCounts(items, facetWith({ source: ["ddbj"] }))
    expect(counts.category).toEqual({ repository: 2, search: 1, analysis: 1 })
  })

  test("collectServicesFacetCounts_categorySelected_同グループのcategory件数は不変", () => {
    const counts = collectServicesFacetCounts(items, facetWith({ category: ["search"] }))
    expect(counts.category).toEqual({ repository: 2, search: 3, analysis: 1, integration: 1 })
  })

  test("collectServicesFacetCounts_categorySelected_source件数はcategoryで絞られる", () => {
    const counts = collectServicesFacetCounts(items, facetWith({ category: ["search"] }))
    expect(counts.source).toEqual({ ddbj: 1, dbcls: 2 })
  })

  test("collectServicesFacetCounts_multiValueCategory_1件が複数categoryへ寄与する", () => {
    const counts = collectServicesFacetCounts([buildItem({ categories: ["repository", "search"] })], emptyServicesFacetState())
    expect(counts.category).toEqual({ repository: 1, search: 1 })
    expect(counts.source).toEqual({ ddbj: 1 })
  })

  test("collectServicesFacetCounts_emptyCategories_sourceのみ数える", () => {
    const counts = collectServicesFacetCounts([buildItem({ source: "dbcls", categories: [] })], emptyServicesFacetState())
    expect(counts.source).toEqual({ dbcls: 1 })
    expect(counts.category).toEqual({})
  })

  test("collectServicesFacetCounts_emptyItems_全グループが空オブジェクト", () => {
    const counts = collectServicesFacetCounts([], emptyServicesFacetState())
    expect(counts).toEqual({ source: {}, category: {} })
  })
})
