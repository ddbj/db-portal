import { describe, expect, it } from "vitest"

import { buildFacets } from "@/server/news-mirror/facets"
import type { MirroredNewsItem, NewsType } from "@/server/news-mirror/types"

const item = (overrides: Partial<MirroredNewsItem> & { id: string; date: string; type?: NewsType }): MirroredNewsItem => ({
  slug: overrides.date,
  lang: "ja",
  dateTime: `${overrides.date}T00:00:00.000Z`,
  retireTime: null,
  db: [],
  tags: [],
  title: overrides.id,
  bodyHtml: "",
  sourceUrl: "",
  sourceMdUrl: "",
  type: "news",
  pairId: null,
  ...overrides,
})

describe("buildFacets", () => {
  const items = [
    item({ id: "a", date: "2026-04-08", type: "notification", db: ["ddbj", "top"], tags: ["Announcement"] }),
    item({ id: "b", date: "2026-03-19", type: "news", db: ["dra"], tags: ["お知らせ"] }),
    item({ id: "c", date: "2025-12-01", type: "news", db: ["ddbj"], tags: ["お知らせ", "メンテナンス"] }),
  ]

  it("counts year facets descending by year", () => {
    const facets = buildFacets(items)
    expect(facets.year).toEqual([
      { value: "2026", count: 2 },
      { value: "2025", count: 1 },
    ])
  })

  it("counts db facets across all items, sorted by count desc", () => {
    const facets = buildFacets(items)
    const ddbj = facets.db.find((b) => b.value === "ddbj")
    expect(ddbj?.count).toBe(2)
  })

  it("counts tag facets including multi-tag entries", () => {
    const facets = buildFacets(items)
    expect(facets.tag.find((b) => b.value === "お知らせ")?.count).toBe(2)
    expect(facets.tag.find((b) => b.value === "メンテナンス")?.count).toBe(1)
  })

  it("type facet always lists both buckets", () => {
    const facets = buildFacets(items)
    expect(facets.type).toEqual([
      { value: "notification", count: 1 },
      { value: "news", count: 2 },
    ])
  })

  it("type facet shows zero counts when empty", () => {
    const facets = buildFacets([])
    expect(facets.type).toEqual([
      { value: "notification", count: 0 },
      { value: "news", count: 0 },
    ])
  })
})
