import { describe, expect, test } from "vitest"

import { dbclsDateFromSlug, type SourceNormalizeConfig } from "../../../../server/news/normalize"
import {
  dbclsSlugStripper,
  ddbjSlugStripper,
  pairToNewsItems,
  parseRawArticle,
} from "../../../../server/news/pair"

const ddbjCfg: SourceNormalizeConfig = {
  source: "ddbj",
  urlBuilder: (lang, slug) =>
    lang === "ja"
      ? `https://www.ddbj.nig.ac.jp/news/ja/${slug}.html`
      : `https://www.ddbj.nig.ac.jp/news/en/${slug}-e.html`,
}

const dbclsCfg: SourceNormalizeConfig = {
  source: "dbcls",
  urlBuilder: (lang, slug) => `https://dbcls.rois.ac.jp/${lang}/${slug}.html`,
  publishedAtFromSlug: dbclsDateFromSlug,
}

describe("ddbjSlugStripper", () => {
  test.each([
    ["ja", "1996-06-21.md", "1996-06-21"],
    ["en", "1996-06-21-e.md", "1996-06-21"],
    ["ja", "2024-04-01_2.md", "2024-04-01_2"],
    ["en", "2024-04-01_2-e.md", "2024-04-01_2"],
  ])("ddbjSlugStripper(%s, %s) → %s", (lang, filename, expected) => {
    expect(ddbjSlugStripper(lang as "ja" | "en", filename)).toBe(expected)
  })
})

describe("dbclsSlugStripper", () => {
  test.each([
    ["ja", "2026-05-01-post1.md", "2026-05-01-post1"],
    ["en", "2026-05-01-post2.md", "2026-05-01-post2"],
    ["ja", "template_service_suspension.md", undefined],
  ])("dbclsSlugStripper(%s, %s) → %s", (lang, filename, expected) => {
    expect(dbclsSlugStripper(lang as "ja" | "en", filename)).toBe(expected)
  })
})

const fmJa = [
  "---",
  "title: 'JA タイトル'",
  "category: news",
  "tags:",
  "  - リリース",
  "date: 2024-01-02T00:00:00+09:00",
  "lang: ja",
  "---",
  "body",
].join("\n")

const fmEn = [
  "---",
  "title: 'EN title'",
  "category: news",
  "tags:",
  "  - Release",
  "date: 2024-01-02T00:00:00+09:00",
  "lang: en",
  "---",
  "body",
].join("\n")

describe("pairToNewsItems (ddbj)", () => {
  test("pairs same slug across ja and en", () => {
    const ja = new Map()
    const en = new Map()
    const jaParsed = parseRawArticle("ddbj", "ja", "2024-01-02.md", fmJa, ddbjSlugStripper)
    const enParsed = parseRawArticle("ddbj", "en", "2024-01-02-e.md", fmEn, ddbjSlugStripper)
    if (jaParsed) ja.set(jaParsed.slug, jaParsed)
    if (enParsed) en.set(enParsed.slug, enParsed)
    const items = pairToNewsItems(ddbjCfg, ja, en)
    expect(items).toHaveLength(1)
    expect(items[0]?.id).toBe("ddbj-2024-01-02")
    expect(items[0]?.title).toEqual({ ja: "JA タイトル", en: "EN title" })
  })

  test("ja only and en only become separate items", () => {
    const ja = new Map()
    const en = new Map()
    const jaParsed = parseRawArticle("ddbj", "ja", "ja-only.md", fmJa, ddbjSlugStripper)
    const enParsed = parseRawArticle("ddbj", "en", "en-only-e.md", fmEn, ddbjSlugStripper)
    if (jaParsed) ja.set(jaParsed.slug, jaParsed)
    if (enParsed) en.set(enParsed.slug, enParsed)
    const items = pairToNewsItems(ddbjCfg, ja, en)
    expect(items).toHaveLength(2)
  })

  test("returns sorted by date desc", () => {
    const olderFm = fmJa.replace("2024-01-02", "2023-01-01")
    const ja = new Map()
    const older = parseRawArticle("ddbj", "ja", "2023-01-01.md", olderFm, ddbjSlugStripper)
    const newer = parseRawArticle("ddbj", "ja", "2024-01-02.md", fmJa, ddbjSlugStripper)
    if (older) ja.set(older.slug, older)
    if (newer) ja.set(newer.slug, newer)
    const items = pairToNewsItems(ddbjCfg, ja, new Map())
    expect(items[0]?.id).toBe("ddbj-2024-01-02")
    expect(items[1]?.id).toBe("ddbj-2023-01-01")
  })
})

describe("pairToNewsItems (dbcls)", () => {
  const dbclsFm = [
    "---",
    "layout: post",
    "published: true",
    "title: 'DBCLS post'",
    "tags:",
    "  - services",
    "---",
    "body",
  ].join("\n")

  test("uses slug for publishedAt when fm has no date", () => {
    const ja = new Map()
    const parsed = parseRawArticle("dbcls", "ja", "2026-05-01-post1.md", dbclsFm, dbclsSlugStripper)
    if (parsed) ja.set(parsed.slug, parsed)
    const items = pairToNewsItems(dbclsCfg, ja, new Map())
    expect(items).toHaveLength(1)
    expect(items[0]?.id).toBe("dbcls-2026-05-01-post1")
    expect(items[0]?.publishedAt).toBe("2026-05-01T00:00:00+09:00")
  })

  test("skips files without dbcls slug pattern", () => {
    expect(parseRawArticle("dbcls", "ja", "template.md", dbclsFm, dbclsSlugStripper)).toBeUndefined()
  })
})
