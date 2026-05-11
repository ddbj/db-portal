import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import { classifyBySlug, linkPairs, normalizeAll, sortItemsByDateDesc } from "@/server/news-mirror/normalize"
import type { TopNewsConfig } from "@/server/news-mirror/top-news"
import type { MirroredNewsItem, ParsedNewsItem } from "@/server/news-mirror/types"

const topNewsOf = (overrides: { ja?: string[]; en?: string[] } = {}): TopNewsConfig => ({
  ja: new Set(overrides.ja ?? []),
  en: new Set(overrides.en ?? []),
})

const parsed = (overrides: Partial<ParsedNewsItem> & Pick<ParsedNewsItem, "slug" | "lang" | "filePath">): ParsedNewsItem => ({
  fileSha: "sha",
  data: {},
  bodyMarkdown: "",
  ...overrides,
})

const makeData = (overrides: Partial<ParsedNewsItem["data"]> = {}): ParsedNewsItem["data"] => ({
  title: "Sample",
  date: "2026-04-08T09:00:00+09:00",
  tags: [],
  db: [],
  ...overrides,
})

const makeItem = (overrides: Partial<MirroredNewsItem>): MirroredNewsItem => ({
  id: "ja-2026-04-08",
  slug: "2026-04-08",
  lang: "ja",
  date: "2026-04-08",
  dateTime: "2026-04-08T00:00:00.000Z",
  retireTime: null,
  db: [],
  tags: [],
  title: "Sample",
  bodyHtml: "",
  sourceUrl: "https://www.ddbj.nig.ac.jp/news/ja/2026-04-08.html",
  sourceMdUrl: "https://github.com/ddbj/www/blob/master/_news/ja/2026-04-08.md",
  type: "news",
  pairId: null,
  ...overrides,
})

describe("classifyBySlug", () => {
  it("returns notification when slug is in topNews for the lang", () => {
    const t = topNewsOf({ ja: ["2026-03-19"] })
    expect(classifyBySlug("2026-03-19", "ja", t)).toBe("notification")
  })

  it("returns news when slug is not in topNews", () => {
    const t = topNewsOf({ ja: ["2026-03-19"] })
    expect(classifyBySlug("2026-04-08", "ja", t)).toBe("news")
  })

  it("classifies per-lang independently", () => {
    const t = topNewsOf({ ja: ["2026-03-19"], en: [] })
    expect(classifyBySlug("2026-03-19", "ja", t)).toBe("notification")
    expect(classifyBySlug("2026-03-19", "en", t)).toBe("news")
  })

  it("property: only listed slugs become notification", () => {
    fc.assert(fc.property(
      fc.array(fc.string({ minLength: 4, maxLength: 12 }), { maxLength: 5 }),
      fc.string({ minLength: 4, maxLength: 12 }),
      (listedSlugs, candidate) => {
        const t = topNewsOf({ ja: listedSlugs })
        const expected = listedSlugs.includes(candidate) ? "notification" : "news"
        expect(classifyBySlug(candidate, "ja", t)).toBe(expected)
      },
    ))
  })
})

describe("normalizeAll", () => {
  it("skips items missing title", async () => {
    const result = await normalizeAll([
      parsed({
        slug: "2026-04-08",
        lang: "ja",
        filePath: "_news/ja/2026-04-08.md",
        data: makeData({ title: undefined }),
      }),
    ])
    expect(result.items).toHaveLength(0)
    expect(result.warnings[0]?.reason).toMatch(/title/)
  })

  it("skips items missing date", async () => {
    const result = await normalizeAll([
      parsed({
        slug: "2026-04-08",
        lang: "ja",
        filePath: "_news/ja/2026-04-08.md",
        data: makeData({ date: undefined }),
      }),
    ])
    expect(result.items).toHaveLength(0)
    expect(result.warnings[0]?.reason).toMatch(/date/)
  })

  it("classifies a slug listed in topNews as notification", async () => {
    const result = await normalizeAll([
      parsed({
        slug: "2026-04-08",
        lang: "ja",
        filePath: "_news/ja/2026-04-08.md",
        data: makeData({ title: "n" }),
      }),
    ], topNewsOf({ ja: ["2026-04-08"] }))
    expect(result.items[0]?.type).toBe("notification")
  })

  it("classifies an unlisted slug as news regardless of tags", async () => {
    const result = await normalizeAll([
      parsed({
        slug: "2026-04-08",
        lang: "ja",
        filePath: "_news/ja/2026-04-08.md",
        data: makeData({ title: "n", tags: ["Announcement", "お知らせ"] }),
      }),
    ])
    expect(result.items[0]?.type).toBe("news")
  })

  it("links ja/en pair when both exist", async () => {
    const result = await normalizeAll([
      parsed({
        slug: "2026-04-08",
        lang: "ja",
        filePath: "_news/ja/2026-04-08.md",
        data: makeData({ title: "ja" }),
      }),
      parsed({
        slug: "2026-04-08",
        lang: "en",
        filePath: "_news/en/2026-04-08-e.md",
        data: makeData({ title: "en" }),
      }),
    ])
    expect(result.items).toHaveLength(2)
    const ja = result.items.find((i) => i.lang === "ja")!
    const en = result.items.find((i) => i.lang === "en")!
    expect(ja.pairId).toBe(en.id)
    expect(en.pairId).toBe(ja.id)
  })

  it("classifies ja and en independently based on per-lang topNews lists", async () => {
    const result = await normalizeAll([
      parsed({
        slug: "2026-04-08",
        lang: "ja",
        filePath: "_news/ja/2026-04-08.md",
        data: makeData({ title: "ja" }),
      }),
      parsed({
        slug: "2026-04-08",
        lang: "en",
        filePath: "_news/en/2026-04-08-e.md",
        data: makeData({ title: "en" }),
      }),
    ], topNewsOf({ ja: ["2026-04-08"], en: ["2026-04-08"] }))
    const ja = result.items.find((i) => i.lang === "ja")!
    const en = result.items.find((i) => i.lang === "en")!
    expect(ja.type).toBe("notification")
    expect(en.type).toBe("notification")
  })

  it("does not link when only one language exists", async () => {
    const result = await normalizeAll([
      parsed({
        slug: "2026-04-08",
        lang: "ja",
        filePath: "_news/ja/2026-04-08.md",
        data: makeData({ title: "ja only" }),
      }),
    ])
    expect(result.items[0]?.pairId).toBeNull()
  })

  it("sorts items by date descending", async () => {
    const result = await normalizeAll([
      parsed({
        slug: "2026-01-01",
        lang: "ja",
        filePath: "_news/ja/2026-01-01.md",
        data: makeData({ title: "old", date: "2026-01-01" }),
      }),
      parsed({
        slug: "2026-04-08",
        lang: "ja",
        filePath: "_news/ja/2026-04-08.md",
        data: makeData({ title: "new", date: "2026-04-08" }),
      }),
    ])
    expect(result.items[0]?.slug).toBe("2026-04-08")
    expect(result.items[1]?.slug).toBe("2026-01-01")
  })

  it("includes retireTime when present and skips when invalid", async () => {
    const ok = await normalizeAll([
      parsed({
        slug: "2026-04-08",
        lang: "ja",
        filePath: "_news/ja/2026-04-08.md",
        data: makeData({ retire_time: "2026-04-14T09:00:00+09:00" }),
      }),
    ])
    expect(ok.items[0]?.retireTime).not.toBeNull()
    const bad = await normalizeAll([
      parsed({
        slug: "2026-04-09",
        lang: "ja",
        filePath: "_news/ja/2026-04-09.md",
        data: makeData({ retire_time: "not-a-date" }),
      }),
    ])
    expect(bad.items[0]?.retireTime).toBeNull()
  })
})

describe("linkPairs / sortItemsByDateDesc", () => {
  it("resets and relinks pairs when called on existing items", () => {
    const ja = makeItem({ id: "ja-x", slug: "x", lang: "ja", pairId: "stale" })
    const en = makeItem({ id: "en-x", slug: "x", lang: "en", pairId: null })
    linkPairs([ja, en])
    expect(ja.pairId).toBe("en-x")
    expect(en.pairId).toBe("ja-x")
  })

  it("sorts descending by dateTime", () => {
    const items = [
      makeItem({ id: "a", dateTime: "2024-01-01T00:00:00Z" }),
      makeItem({ id: "b", dateTime: "2026-01-01T00:00:00Z" }),
      makeItem({ id: "c", dateTime: "2025-01-01T00:00:00Z" }),
    ]
    sortItemsByDateDesc(items)
    expect(items.map((i) => i.id)).toEqual(["b", "c", "a"])
  })
})
