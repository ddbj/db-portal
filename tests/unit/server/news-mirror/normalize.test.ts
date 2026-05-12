import * as fc from "fast-check"
import { describe, expect, it } from "vitest"

import {
  classifyBySlug,
  dbclsDateFromSlug,
  linkPairs,
  normalizeAll,
  sortItemsByDateDesc,
} from "@/server/news-mirror/normalize"
import { dbclsConfig, ddbjConfig, type NewsSourceConfig } from "@/server/news-mirror/sources"
import type { TopNewsConfig } from "@/server/news-mirror/top-news"
import type { MirroredNewsItem, NewsSource, ParsedNewsItem } from "@/server/news-mirror/types"

const topNewsOf = (overrides: { ja?: string[]; en?: string[] } = {}): TopNewsConfig => ({
  ja: new Set(overrides.ja ?? []),
  en: new Set(overrides.en ?? []),
})

const ddbj = ddbjConfig()
const dbcls = dbclsConfig()

const parsed = (
  cfg: NewsSourceConfig,
  overrides: Partial<ParsedNewsItem> & Pick<ParsedNewsItem, "slug" | "lang" | "filePath">,
): ParsedNewsItem => ({
  source: cfg.source,
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
  id: "ddbj-ja-2026-04-08",
  source: "ddbj",
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
  sourceMdUrl: "https://github.com/ddbj/www/blob/main/_news/ja/2026-04-08.md",
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

describe("normalizeAll (ddbj)", () => {
  it("skips items missing title", async () => {
    const result = await normalizeAll(ddbj, [
      parsed(ddbj, {
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
    const result = await normalizeAll(ddbj, [
      parsed(ddbj, {
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
    const result = await normalizeAll(ddbj, [
      parsed(ddbj, {
        slug: "2026-04-08",
        lang: "ja",
        filePath: "_news/ja/2026-04-08.md",
        data: makeData({ title: "n" }),
      }),
    ], topNewsOf({ ja: ["2026-04-08"] }))
    expect(result.items[0]?.type).toBe("notification")
  })

  it("classifies an unlisted slug as news and maps raw tags to canonical keys", async () => {
    const result = await normalizeAll(ddbj, [
      parsed(ddbj, {
        slug: "2026-04-08",
        lang: "ja",
        filePath: "_news/ja/2026-04-08.md",
        data: makeData({ title: "n", tags: ["Announcement", "お知らせ"] }),
      }),
    ])
    expect(result.items[0]?.type).toBe("news")
    expect(result.items[0]?.tags).toEqual(["announcement"])
  })

  it("drops unknown tags and records them in droppedTags", async () => {
    const result = await normalizeAll(ddbj, [
      parsed(ddbj, {
        slug: "2026-04-08",
        lang: "ja",
        filePath: "_news/ja/2026-04-08.md",
        data: makeData({ title: "n", tags: ["お知らせ", "UnknownTag", "weird"] }),
      }),
    ])
    expect(result.items[0]?.tags).toEqual(["announcement"])
    expect(result.droppedTags[0]?.tags).toEqual(["UnknownTag", "weird"])
  })

  it("uses ${source}-${lang}-${slug} id format", async () => {
    const result = await normalizeAll(ddbj, [
      parsed(ddbj, {
        slug: "2026-04-08",
        lang: "ja",
        filePath: "_news/ja/2026-04-08.md",
        data: makeData(),
      }),
    ])
    expect(result.items[0]?.id).toBe("ddbj-ja-2026-04-08")
    expect(result.items[0]?.source).toBe("ddbj")
  })

  it("does not link when only one language exists", async () => {
    const result = await normalizeAll(ddbj, [
      parsed(ddbj, {
        slug: "2026-04-08",
        lang: "ja",
        filePath: "_news/ja/2026-04-08.md",
        data: makeData({ title: "ja only" }),
      }),
    ])
    expect(result.items[0]?.pairId).toBeNull()
  })

  it("includes retireTime when present and skips when invalid", async () => {
    const ok = await normalizeAll(ddbj, [
      parsed(ddbj, {
        slug: "2026-04-08",
        lang: "ja",
        filePath: "_news/ja/2026-04-08.md",
        data: makeData({ retire_time: "2026-04-14T09:00:00+09:00" }),
      }),
    ])
    expect(ok.items[0]?.retireTime).not.toBeNull()
    const bad = await normalizeAll(ddbj, [
      parsed(ddbj, {
        slug: "2026-04-09",
        lang: "ja",
        filePath: "_news/ja/2026-04-09.md",
        data: makeData({ retire_time: "not-a-date" }),
      }),
    ])
    expect(bad.items[0]?.retireTime).toBeNull()
  })

  it("sorts items by date desc when both sorted via sortItemsByDateDesc", async () => {
    const { items } = await normalizeAll(ddbj, [
      parsed(ddbj, {
        slug: "2026-01-01",
        lang: "ja",
        filePath: "_news/ja/2026-01-01.md",
        data: makeData({ title: "old", date: "2026-01-01" }),
      }),
      parsed(ddbj, {
        slug: "2026-04-08",
        lang: "ja",
        filePath: "_news/ja/2026-04-08.md",
        data: makeData({ title: "new", date: "2026-04-08" }),
      }),
    ])
    sortItemsByDateDesc(items)
    expect(items[0]?.slug).toBe("2026-04-08")
    expect(items[1]?.slug).toBe("2026-01-01")
  })
})

describe("dbclsDateFromSlug", () => {
  it("returns ISO date for valid yyyy-mm-dd-postN", () => {
    const d = dbclsDateFromSlug("2025-01-10-post1")
    expect(d?.date).toBe("2025-01-10")
  })

  it("uses post number as minute offset for stable sort", () => {
    const post1 = dbclsDateFromSlug("2025-01-10-post1")
    const post2 = dbclsDateFromSlug("2025-01-10-post2")
    expect(post1).not.toBeNull()
    expect(post2).not.toBeNull()
    expect(post1!.dateTime < post2!.dateTime).toBe(true)
  })

  it("returns null for invalid format", () => {
    expect(dbclsDateFromSlug("template_service")).toBeNull()
    expect(dbclsDateFromSlug("2025-01-10")).toBeNull()
  })
})

describe("normalizeAll (dbcls)", () => {
  it("derives date from slug filename when published is true", async () => {
    const result = await normalizeAll(dbcls, [
      parsed(dbcls, {
        slug: "2025-01-10-post1",
        lang: "ja",
        filePath: "_posts/ja/2025-01-10-post1.md",
        data: { title: "Hello", tags: ["public_relations"], published: true },
      }),
    ])
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.date).toBe("2025-01-10")
    expect(result.items[0]?.id).toBe("dbcls-ja-2025-01-10-post1")
    expect(result.items[0]?.source).toBe("dbcls")
    expect(result.items[0]?.type).toBe("news")
    expect(result.items[0]?.db).toEqual([])
    expect(result.items[0]?.tags).toEqual(["announcement"])
  })

  it("forces type=news even if a slug appears in topNews accidentally", async () => {
    const result = await normalizeAll(dbcls, [
      parsed(dbcls, {
        slug: "2025-01-10-post1",
        lang: "ja",
        filePath: "_posts/ja/2025-01-10-post1.md",
        data: { title: "Hello" },
      }),
    ], topNewsOf({ ja: ["2025-01-10-post1"] }))
    expect(result.items[0]?.type).toBe("news")
  })

  it("skips items with published: false", async () => {
    const result = await normalizeAll(dbcls, [
      parsed(dbcls, {
        slug: "2025-01-10-post1",
        lang: "ja",
        filePath: "_posts/ja/2025-01-10-post1.md",
        data: { title: "Hello", published: false },
      }),
    ])
    expect(result.items).toHaveLength(0)
    expect(result.warnings[0]?.reason).toMatch(/published/)
  })

  it("treats published omission as published=true", async () => {
    const result = await normalizeAll(dbcls, [
      parsed(dbcls, {
        slug: "2025-01-10-post1",
        lang: "ja",
        filePath: "_posts/ja/2025-01-10-post1.md",
        data: { title: "Hello" },
      }),
    ])
    expect(result.items).toHaveLength(1)
  })

  it("maps dbcls tags to canonical keys (services -> service, etc.)", async () => {
    const result = await normalizeAll(dbcls, [
      parsed(dbcls, {
        slug: "2025-01-10-post1",
        lang: "ja",
        filePath: "_posts/ja/2025-01-10-post1.md",
        data: { title: "Hello", tags: ["services", "events", "registration", "other"] },
      }),
    ])
    expect(result.items[0]?.tags).toEqual(["service", "event", "recruitment", "other"])
  })

  it("builds sourceUrl matching Jekyll permalink", async () => {
    const result = await normalizeAll(dbcls, [
      parsed(dbcls, {
        slug: "2025-01-10-post1",
        lang: "ja",
        filePath: "_posts/ja/2025-01-10-post1.md",
        data: { title: "Hello" },
      }),
    ])
    expect(result.items[0]?.sourceUrl).toBe(
      "https://dbcls.rois.ac.jp/ja/2025/01/10/post1.html",
    )
  })
})

describe("linkPairs / sortItemsByDateDesc", () => {
  it("resets and relinks pairs within the same source", () => {
    const ja = makeItem({ id: "ddbj-ja-x", slug: "x", lang: "ja", pairId: "stale" })
    const en = makeItem({ id: "ddbj-en-x", slug: "x", lang: "en", pairId: null })
    linkPairs([ja, en])
    expect(ja.pairId).toBe("ddbj-en-x")
    expect(en.pairId).toBe("ddbj-ja-x")
  })

  it("does not link cross-source items with the same slug", () => {
    const ddbjJa = makeItem({ id: "ddbj-ja-x", slug: "x", lang: "ja", source: "ddbj" })
    const dbclsEn = makeItem({ id: "dbcls-en-x", slug: "x", lang: "en", source: "dbcls" })
    linkPairs([ddbjJa, dbclsEn])
    expect(ddbjJa.pairId).toBeNull()
    expect(dbclsEn.pairId).toBeNull()
  })

  it("property: same-source pairs are linked", () => {
    fc.assert(fc.property(
      fc.string({ minLength: 3, maxLength: 10 }),
      fc.constantFrom<NewsSource>("ddbj", "dbcls"),
      (slug, s) => {
        const ja = makeItem({ id: `${s}-ja-${slug}`, slug, lang: "ja", source: s })
        const en = makeItem({ id: `${s}-en-${slug}`, slug, lang: "en", source: s })
        linkPairs([ja, en])
        expect(ja.pairId).toBe(en.id)
        expect(en.pairId).toBe(ja.id)
      },
    ))
  })

  it("property: cross-source items with the same slug remain unlinked", () => {
    fc.assert(fc.property(
      fc.string({ minLength: 3, maxLength: 10 }),
      (slug) => {
        const ja = makeItem({ id: `ddbj-ja-${slug}`, slug, lang: "ja", source: "ddbj" })
        const en = makeItem({ id: `dbcls-en-${slug}`, slug, lang: "en", source: "dbcls" })
        linkPairs([ja, en])
        expect(ja.pairId).toBeNull()
        expect(en.pairId).toBeNull()
      },
    ))
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
