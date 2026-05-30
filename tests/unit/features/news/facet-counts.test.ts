import { describe, expect, test } from "vitest"

import {
  collectNewsFacetCounts,
  emptyNewsFacetState,
  type NewsFacetState,
} from "~/features/news"
import type { NewsItem } from "~/lib/api"

const buildItem = (overrides: Partial<NewsItem> = {}): NewsItem => ({
  id: "n",
  source: "ddbj",
  category: "announcement",
  featured: false,
  publishedAt: "2024-01-01T00:00:00+09:00",
  title: { ja: "タイトル", en: "Title" },
  db: [],
  rawTags: { ja: [], en: [] },
  ...overrides,
})

// source / category / year / db を意図的にばらした 5 件 (+ 言語別空 title 1 件)
const items: NewsItem[] = [
  buildItem({ id: "1", source: "ddbj", category: "announcement", publishedAt: "2024-03-01T00:00:00+09:00", db: ["bioproject"] }),
  buildItem({ id: "2", source: "ddbj", category: "data-release", publishedAt: "2024-05-01T00:00:00+09:00", db: ["bioproject", "sra"] }),
  buildItem({ id: "3", source: "ddbj", category: "announcement", publishedAt: "2023-07-01T00:00:00+09:00", db: ["sra"] }),
  buildItem({ id: "4", source: "dbcls", category: "announcement", publishedAt: "2024-09-01T00:00:00+09:00", db: [] }),
  buildItem({ id: "5", source: "dbcls", category: "service", publishedAt: "2023-11-01T00:00:00+09:00", db: ["togotv"] }),
]

const facetWith = (overrides: Partial<NewsFacetState>): NewsFacetState => ({
  ...emptyNewsFacetState(),
  ...overrides,
})

describe("collectNewsFacetCounts", () => {
  test("collectNewsFacetCounts_noFilter_tallies全件をグループ別に集計する", () => {
    const counts = collectNewsFacetCounts(items, "ja", emptyNewsFacetState())
    expect(counts.source).toEqual({ ddbj: 3, dbcls: 2 })
    expect(counts.category).toEqual({ announcement: 3, "data-release": 1, service: 1 })
    expect(counts.year).toEqual({ 2024: 3, 2023: 2 })
    expect(counts.service).toEqual({ bioproject: 2, sra: 2, togotv: 1 })
  })

  test("collectNewsFacetCounts_sourceSelected_同グループのsource件数は不変", () => {
    const counts = collectNewsFacetCounts(items, "ja", facetWith({ source: ["ddbj"] }))
    expect(counts.source).toEqual({ ddbj: 3, dbcls: 2 })
  })

  test("collectNewsFacetCounts_sourceSelected_他グループは絞り込みに連動する", () => {
    const counts = collectNewsFacetCounts(items, "ja", facetWith({ source: ["ddbj"] }))
    expect(counts.category).toEqual({ announcement: 2, "data-release": 1 })
    expect(counts.year).toEqual({ 2024: 2, 2023: 1 })
    expect(counts.service).toEqual({ bioproject: 2, sra: 2 })
  })

  test("collectNewsFacetCounts_categorySelected_同グループのcategory件数は不変", () => {
    const counts = collectNewsFacetCounts(items, "ja", facetWith({ category: ["announcement"] }))
    expect(counts.category).toEqual({ announcement: 3, "data-release": 1, service: 1 })
  })

  test("collectNewsFacetCounts_categorySelected_source件数はcategoryで絞られる", () => {
    const counts = collectNewsFacetCounts(items, "ja", facetWith({ category: ["announcement"] }))
    expect(counts.source).toEqual({ ddbj: 2, dbcls: 1 })
  })

  test("collectNewsFacetCounts_twoGroupsSelected_AND適用後の件数になる", () => {
    const counts = collectNewsFacetCounts(items, "ja", facetWith({ source: ["ddbj"], year: [2024] }))
    // source 件数は自グループ source を除外、year=2024 だけ適用
    expect(counts.source).toEqual({ ddbj: 2, dbcls: 1 })
    // year 件数は自グループ year を除外、source=ddbj だけ適用
    expect(counts.year).toEqual({ 2024: 2, 2023: 1 })
    // category は source=ddbj かつ year=2024 適用
    expect(counts.category).toEqual({ announcement: 1, "data-release": 1 })
    expect(counts.service).toEqual({ bioproject: 2, sra: 1 })
  })

  test("collectNewsFacetCounts_multiValueDb_1件が複数dbへ寄与する", () => {
    const counts = collectNewsFacetCounts(items, "ja", facetWith({ service: ["bioproject"] }))
    // service 件数は自グループ service を除外 → db 全集合は不変
    expect(counts.service).toEqual({ bioproject: 2, sra: 2, togotv: 1 })
    // 他グループは db=bioproject (items 1,2) で絞る
    expect(counts.source).toEqual({ ddbj: 2 })
    expect(counts.category).toEqual({ announcement: 1, "data-release": 1 })
  })

  test("collectNewsFacetCounts_emptyTitleInLang_その言語の集計から除外される", () => {
    const withHidden = [
      ...items,
      buildItem({ id: "ja-only", source: "dbcls", category: "event", title: { ja: "日本語のみ", en: "" } }),
    ]
    const ja = collectNewsFacetCounts(withHidden, "ja", emptyNewsFacetState())
    const en = collectNewsFacetCounts(withHidden, "en", emptyNewsFacetState())
    expect(ja.category.event).toBe(1)
    expect(ja.source.dbcls).toBe(3)
    expect(en.category.event).toBeUndefined()
    expect(en.source.dbcls).toBe(2)
  })

  test("collectNewsFacetCounts_malformedDate_yearに数えず他グループには数える", () => {
    const withBadDate = [
      buildItem({ id: "bad", source: "ddbj", category: "maintenance", publishedAt: "not-a-date", db: ["x"] }),
    ]
    const counts = collectNewsFacetCounts(withBadDate, "ja", emptyNewsFacetState())
    expect(counts.year).toEqual({})
    expect(counts.source).toEqual({ ddbj: 1 })
    expect(counts.category).toEqual({ maintenance: 1 })
    expect(counts.service).toEqual({ x: 1 })
  })

  test("collectNewsFacetCounts_emptyItems_全グループが空オブジェクト", () => {
    const counts = collectNewsFacetCounts([], "ja", emptyNewsFacetState())
    expect(counts).toEqual({ source: {}, category: {}, year: {}, service: {} })
  })
})
