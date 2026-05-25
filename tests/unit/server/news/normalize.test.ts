import { describe, expect, test } from "vitest"

import {
  dbclsDateFromSlug,
  parseFrontMatter,
  type RawArticle,
  type SourceNormalizeConfig,
  tagsToCategory,
  toNewsItem,
} from "../../../../server/news/normalize"

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
    source: "ddbj",
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
    source: "ddbj",
    lang: "en",
    slug: "2024-01-02",
    fm: {
      title: "EN title",
      date: "2024-01-02T00:00:00+09:00",
      db: ["ddbj"],
      tags: ["Release"],
    },
  }

  test("pairs ja and en into NewsItem with source-prefixed id", () => {
    const item = toNewsItem(ddbjCfg, ja, en)
    expect(item?.id).toBe("ddbj-2024-01-02")
    expect(item?.title).toEqual({ ja: "ja タイトル", en: "EN title" })
    expect(item?.category).toBe("release")
    expect(item?.url?.ja).toContain("/news/ja/2024-01-02.html")
    expect(item?.url?.en).toContain("/news/en/2024-01-02-e.html")
    expect(item?.retireTime).toBe("2024-02-02T00:00:00+09:00")
  })

  test("returns undefined when both articles are missing", () => {
    expect(toNewsItem(ddbjCfg, undefined, undefined)).toBeUndefined()
  })

  test("returns undefined when date is missing and no fallback", () => {
    const broken: RawArticle = { ...ja, fm: { title: "x" } }
    expect(toNewsItem(ddbjCfg, broken, undefined)).toBeUndefined()
  })

  test("ja-only article keeps en title empty", () => {
    const item = toNewsItem(ddbjCfg, ja, undefined)
    expect(item?.title.ja).toBe("ja タイトル")
    expect(item?.title.en).toBe("")
    expect(item?.url?.en).toBeUndefined()
  })

  test("dbcls derives publishedAt from slug when fm.date is missing", () => {
    const dbclsJa: RawArticle = {
      source: "dbcls",
      lang: "ja",
      slug: "2026-05-01-post1",
      fm: { title: "DBCLS post" },
    }
    const item = toNewsItem(dbclsCfg, dbclsJa, undefined)
    expect(item?.id).toBe("dbcls-2026-05-01-post1")
    expect(item?.publishedAt).toBe("2026-05-01T00:00:00+09:00")
  })

  test("published: false drops the item", () => {
    const drafted: RawArticle = {
      source: "dbcls",
      lang: "ja",
      slug: "2026-05-02-post1",
      fm: { title: "draft", published: "false" },
    }
    expect(toNewsItem(dbclsCfg, drafted, undefined)).toBeUndefined()
  })
})
