import { describe, expect, test } from "vitest"

import {
  pairToNewsItems,
  parseRawArticle,
  slugFromFilename,
} from "../../../../server/news/pair"

describe("slugFromFilename", () => {
  test.each([
    ["ja", "1996-06-21.md", "1996-06-21"],
    ["en", "1996-06-21-e.md", "1996-06-21"],
    ["ja", "2024-04-01_2.md", "2024-04-01_2"],
    ["en", "2024-04-01_2-e.md", "2024-04-01_2"],
  ])("slugFromFilename(%s, %s) → %s", (lang, filename, expected) => {
    expect(slugFromFilename(lang as "ja" | "en", filename)).toBe(expected)
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

describe("pairToNewsItems", () => {
  test("pairs same slug across ja and en", () => {
    const ja = new Map()
    const en = new Map()
    const jaParsed = parseRawArticle("ja", "2024-01-02.md", fmJa)
    const enParsed = parseRawArticle("en", "2024-01-02-e.md", fmEn)
    if (jaParsed) ja.set(jaParsed.slug, jaParsed)
    if (enParsed) en.set(enParsed.slug, enParsed)
    const items = pairToNewsItems(ja, en)
    expect(items).toHaveLength(1)
    expect(items[0]?.id).toBe("2024-01-02")
    expect(items[0]?.title).toEqual({ ja: "JA タイトル", en: "EN title" })
  })

  test("ja only and en only become separate items", () => {
    const ja = new Map()
    const en = new Map()
    const jaParsed = parseRawArticle("ja", "ja-only.md", fmJa)
    const enParsed = parseRawArticle("en", "en-only-e.md", fmEn)
    if (jaParsed) ja.set(jaParsed.slug, jaParsed)
    if (enParsed) en.set(enParsed.slug, enParsed)
    const items = pairToNewsItems(ja, en)
    expect(items).toHaveLength(2)
  })

  test("returns sorted by date desc", () => {
    const olderFm = fmJa.replace("2024-01-02", "2023-01-01")
    const ja = new Map()
    const older = parseRawArticle("ja", "2023-01-01.md", olderFm)
    const newer = parseRawArticle("ja", "2024-01-02.md", fmJa)
    if (older) ja.set(older.slug, older)
    if (newer) ja.set(newer.slug, newer)
    const items = pairToNewsItems(ja, new Map())
    expect(items[0]?.id).toBe("2024-01-02")
    expect(items[1]?.id).toBe("2023-01-01")
  })
})
