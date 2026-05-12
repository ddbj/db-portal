import { describe, expect, it } from "vitest"

import { buildFacets } from "@/server/news-mirror/facets"
import type { CanonicalTag, MirroredNewsItem, NewsType } from "@/server/news-mirror/types"

const item = (
  overrides: Partial<MirroredNewsItem> & { id: string; date: string; type?: NewsType },
): MirroredNewsItem => ({
  source: "ddbj",
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
    item({ id: "a", date: "2026-04-08", type: "notification", db: ["ddbj", "top"], tags: ["announcement"] }),
    item({ id: "b", date: "2026-03-19", type: "news", db: ["dra"], tags: ["announcement"] }),
    item({ id: "c", date: "2025-12-01", type: "news", db: ["ddbj"], tags: ["announcement", "maintenance"] }),
    item({ id: "d", date: "2025-08-01", source: "dbcls", type: "news", tags: ["service"], slug: "2025-08-01-post1" }),
  ]

  it("counts year facets descending by year", () => {
    const facets = buildFacets(items)
    expect(facets.year).toEqual([
      { value: "2026", count: 2 },
      { value: "2025", count: 2 },
    ])
  })

  it("counts db facets across all items (dbcls items contribute nothing since db=[])", () => {
    const facets = buildFacets(items)
    const ddbjBucket = facets.db.find((b) => b.value === "ddbj")
    expect(ddbjBucket?.count).toBe(2)
  })

  it("counts tag facets using canonical keys", () => {
    const facets = buildFacets(items)
    const findTag = (t: CanonicalTag) => facets.tag.find((b) => b.value === t)
    expect(findTag("announcement")?.count).toBe(3)
    expect(findTag("maintenance")?.count).toBe(1)
    expect(findTag("service")?.count).toBe(1)
    expect(findTag("recruitment")?.count).toBe(0)
  })

  it("tag facet always lists all supported canonical keys", () => {
    const facets = buildFacets([])
    expect(facets.tag.map((b) => b.value)).toEqual([
      "announcement",
      "data-release",
      "maintenance",
      "service",
      "event",
      "recruitment",
      "other",
    ])
    expect(facets.tag.every((b) => b.count === 0)).toBe(true)
  })

  it("source facet lists both supported sources", () => {
    const facets = buildFacets(items)
    expect(facets.source).toEqual([
      { value: "ddbj", count: 3 },
      { value: "dbcls", count: 1 },
    ])
  })

  it("source facet shows zero counts when empty", () => {
    const facets = buildFacets([])
    expect(facets.source).toEqual([
      { value: "ddbj", count: 0 },
      { value: "dbcls", count: 0 },
    ])
  })

  it("type facet always lists both buckets", () => {
    const facets = buildFacets(items)
    expect(facets.type).toEqual([
      { value: "notification", count: 1 },
      { value: "news", count: 3 },
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
