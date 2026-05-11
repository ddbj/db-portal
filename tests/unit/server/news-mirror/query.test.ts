import { describe, expect, it } from "vitest"

import { queryNews } from "@/server/news-mirror/query"
import { type MirroredNewsItem, NEWS_CACHE_SCHEMA_VERSION, type NewsSnapshot, type NewsType } from "@/server/news-mirror/types"

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

const snapshotOf = (items: MirroredNewsItem[]): NewsSnapshot => ({
  items: [...items].sort((a, b) => (a.dateTime < b.dateTime ? 1 : -1)),
  fileShas: {},
  builtAt: "2026-05-11T00:00:00.000Z",
  sourceSha: "sha",
  schemaVersion: NEWS_CACHE_SCHEMA_VERSION,
})

describe("queryNews", () => {
  const items = [
    item({ id: "a", date: "2026-04-08", type: "notification", db: ["ddbj", "top"], tags: ["Announcement"] }),
    item({ id: "b", date: "2026-03-19", type: "news", db: ["dra"], tags: ["お知らせ"] }),
    item({ id: "c", date: "2025-12-01", type: "news", db: ["jga"], tags: ["メンテナンス"], lang: "en" }),
    item({ id: "d", date: "2026-04-01", type: "news", db: ["ddbj"], tags: ["お知らせ"], retireTime: "2026-04-10T00:00:00.000Z" }),
  ]

  it("filters by lang", () => {
    const result = queryNews(snapshotOf(items), { lang: "en" })
    expect(result.hits.map((h) => h.id)).toEqual(["c"])
  })

  it("filters by type", () => {
    const result = queryNews(snapshotOf(items), { lang: "ja", type: "notification" })
    expect(result.hits.map((h) => h.id)).toEqual(["a"])
  })

  it("filters by db (any-of)", () => {
    const result = queryNews(snapshotOf(items), { lang: "ja", db: ["dra"] })
    expect(result.hits.map((h) => h.id)).toEqual(["b"])
  })

  it("filters by tag (any-of)", () => {
    const result = queryNews(snapshotOf(items), { lang: "ja", tag: ["Announcement"] })
    expect(result.hits.map((h) => h.id)).toEqual(["a"])
  })

  it("filters by year", () => {
    const result = queryNews(snapshotOf(items), { lang: "ja", year: "2026", retired: "all" })
    expect(result.hits.map((h) => h.id).sort()).toEqual(["a", "b", "d"])
  })

  it("excludes retired items by default", () => {
    const now = new Date("2026-05-01T00:00:00.000Z")
    const result = queryNews(snapshotOf(items), { lang: "ja" }, now)
    expect(result.hits.map((h) => h.id)).not.toContain("d")
  })

  it("includes retired with retired=all", () => {
    const now = new Date("2026-05-01T00:00:00.000Z")
    const result = queryNews(snapshotOf(items), { lang: "ja", retired: "all" }, now)
    expect(result.hits.map((h) => h.id)).toContain("d")
  })

  it("returns only retired with retired=1", () => {
    const now = new Date("2026-05-01T00:00:00.000Z")
    const result = queryNews(snapshotOf(items), { lang: "ja", retired: "1" }, now)
    expect(result.hits.map((h) => h.id)).toEqual(["d"])
  })

  it("respects limit", () => {
    const result = queryNews(snapshotOf(items), { lang: "ja", retired: "all", limit: 1 })
    expect(result.hits).toHaveLength(1)
    expect(result.nextCursor).not.toBeNull()
  })

  it("uses cursor for pagination", () => {
    const first = queryNews(snapshotOf(items), { lang: "ja", retired: "all", limit: 2 })
    expect(first.hits.map((h) => h.id)).toEqual(["a", "d"])
    const next = queryNews(snapshotOf(items), { lang: "ja", retired: "all", limit: 2, cursor: first.nextCursor })
    expect(next.hits.map((h) => h.id)).toEqual(["b"])
    expect(next.nextCursor).toBeNull()
  })

  it("includes facets for the filtered set", () => {
    const result = queryNews(snapshotOf(items), { lang: "ja", retired: "all" })
    expect(result.facets.year.find((b) => b.value === "2026")?.count).toBe(3)
    expect(result.facets.db.find((b) => b.value === "ddbj")?.count).toBe(2)
  })

  it("returns empty result with empty snapshot", () => {
    const result = queryNews(snapshotOf([]), { lang: "ja" })
    expect(result.hits).toHaveLength(0)
    expect(result.total).toBe(0)
  })
})
