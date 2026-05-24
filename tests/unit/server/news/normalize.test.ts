import { describe, expect, test } from "vitest"

import {
  parseFrontMatter,
  type RawArticle,
  tagsToCategory,
  toNewsItem,
} from "../../../../server/news/normalize"

const buildMarkdown = (frontMatter: string, body = "<p>body</p>"): string =>
  `---\n${frontMatter}\n---\n${body}`

describe("tagsToCategory", () => {
  test.each([
    [["重要"], "announcement"],
    [["Announcement"], "announcement"],
    [["notice"], "announcement"],
    [["リリース"], "release"],
    [["Release"], "release"],
    [["メンテナンス"], "maintenance"],
    [["障害"], "maintenance"],
    [["復旧"], "maintenance"],
    [["イベント"], "event"],
    [["Workshop"], "event"],
    [["お知らせ"], "news"],
    [[], "news"],
  ])("tagsToCategory(%j) → %s", (tags, expected) => {
    expect(tagsToCategory(tags)).toBe(expected)
  })

  test("first matching enum wins", () => {
    expect(tagsToCategory(["メンテナンス", "重要"])).toBe("maintenance")
  })
})

describe("parseFrontMatter", () => {
  test("parses scalar and array keys", () => {
    const md = buildMarkdown([
      "layout: simple",
      "title: 'タイトル'",
      "category: news",
      "db:",
      "  - ddbj",
      "  - jga",
      "tags:",
      "  - リリース",
      "date: 2024-01-02T00:00:00+09:00",
      "lang: ja",
    ].join("\n"))
    const parsed = parseFrontMatter(md)
    expect(parsed?.fm.title).toBe("タイトル")
    expect(parsed?.fm.db).toEqual(["ddbj", "jga"])
    expect(parsed?.fm.tags).toEqual(["リリース"])
    expect(parsed?.fm.date).toBe("2024-01-02T00:00:00+09:00")
    expect(parsed?.body).toBe("<p>body</p>")
  })

  test("returns undefined when front matter is missing", () => {
    expect(parseFrontMatter("body without front matter")).toBeUndefined()
  })

  test("handles quoted and unquoted values", () => {
    const md = buildMarkdown([
      "title: \"Quoted title\"",
      "category: news",
      "date: 2024-01-01T00:00:00Z",
    ].join("\n"))
    expect(parseFrontMatter(md)?.fm.title).toBe("Quoted title")
  })
})

describe("toNewsItem", () => {
  const ja: RawArticle = {
    lang: "ja",
    slug: "2024-01-02",
    fm: {
      title: "ja タイトル",
      date: "2024-01-02T00:00:00+09:00",
      retire_time: "2024-02-02T00:00:00+09:00",
      db: ["ddbj"],
      tags: ["リリース"],
    },
  }
  const en: RawArticle = {
    lang: "en",
    slug: "2024-01-02",
    fm: {
      title: "EN title",
      date: "2024-01-02T00:00:00+09:00",
      db: ["ddbj"],
      tags: ["Release"],
    },
  }

  test("pairs ja and en into NewsItem with shared id", () => {
    const item = toNewsItem(ja, en)
    expect(item?.id).toBe("2024-01-02")
    expect(item?.title).toEqual({ ja: "ja タイトル", en: "EN title" })
    expect(item?.category).toBe("release")
    expect(item?.url?.ja).toContain("/news/ja/2024-01-02.html")
    expect(item?.url?.en).toContain("/news/en/2024-01-02-e.html")
    expect(item?.retireTime).toBe("2024-02-02T00:00:00+09:00")
  })

  test("returns undefined when both articles are missing", () => {
    expect(toNewsItem(undefined, undefined)).toBeUndefined()
  })

  test("returns undefined when date is missing", () => {
    const broken: RawArticle = { ...ja, fm: { title: "x" } }
    expect(toNewsItem(broken, undefined)).toBeUndefined()
  })

  test("ja-only article keeps en title empty", () => {
    const item = toNewsItem(ja, undefined)
    expect(item?.title.ja).toBe("ja タイトル")
    expect(item?.title.en).toBe("")
    expect(item?.url?.en).toBeUndefined()
  })
})
