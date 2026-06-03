import { describe, expect, test } from "vitest"

import {
  parseFrontMatter,
  type RawArticle,
  stripHtmlTags,
  tagsToCategory,
  toNewsItem,
} from "../../../../server/news/normalize"
import { dbclsCfg, ddbjCfg } from "./_fixtures"

const buildMarkdown = (frontMatter: string, body = "<p>body</p>"): string =>
  `---\n${frontMatter}\n---\n${body}`

describe("tagsToCategory", () => {
  test.each([
    [["お知らせ"], "announcement"],
    [["Announcement"], "announcement"],
    [["データ公開"], "data-release"],
    [["Data Release"], "data-release"],
    [["メンテナンス"], "maintenance"],
    [["Maintenance"], "maintenance"],
    [["未知"], "other"],
    [[], "other"],
  ])("tagsToCategory(ddbj, %j) → %s", (tags, expected) => {
    expect(tagsToCategory("ddbj", tags)).toBe(expected)
  })

  test.each([
    [["public_relations"], "announcement"],
    [["events"], "event"],
    [["registration"], "event"],
    [["services"], "service"],
    [["other"], "other"],
    [["unknown"], "other"],
  ])("tagsToCategory(dbcls, %j) → %s", (tags, expected) => {
    expect(tagsToCategory("dbcls", tags)).toBe(expected)
  })

  test("tagsToCategory_multipleMatches_returnsFirstEnumInOrder", () => {
    expect(tagsToCategory("ddbj", ["メンテナンス", "お知らせ"])).toBe("maintenance")
  })

  test("tagsToCategory_ddbjVocabRejectedForDbcls", () => {
    expect(tagsToCategory("dbcls", ["お知らせ"])).toBe("other")
  })
})

describe("stripHtmlTags", () => {
  test.each([
    [
      "<span class=\"red\">[復旧]</span> D-way で BioSample の登録ができない不具合",
      "[復旧] D-way で BioSample の登録ができない不具合",
    ],
    ["plain text", "plain text"],
    ["<b>bold</b> and <i>italic</i>", "bold and italic"],
    ["  before\n\t<br/>after  ", "before after"],
    ["", ""],
  ])("stripHtmlTags(%j) → %j", (input, expected) => {
    expect(stripHtmlTags(input)).toBe(expected)
  })
})

describe("parseFrontMatter", () => {
  test("parseFrontMatter_scalarAndArrayValues_extractsBoth", () => {
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

  test("parseFrontMatter_missingFrontMatter_returnsUndefined", () => {
    expect(parseFrontMatter("body without front matter")).toBeUndefined()
  })

  test("parseFrontMatter_quotedValue_unwrapsQuotes", () => {
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
      db: ["ddbj"],
      tags: ["データ公開"],
    },
    body: "",
  }
  const en: RawArticle = {
    source: "ddbj",
    lang: "en",
    slug: "2024-01-02",
    fm: {
      title: "EN title",
      date: "2024-01-02T00:00:00+09:00",
      db: ["ddbj"],
      tags: ["Data Release"],
    },
    body: "",
  }

  test("toNewsItem_jaAndEn_buildsSourcePrefixedIdAndPairedTitle", () => {
    const item = toNewsItem(ddbjCfg, ja, en)
    expect(item?.id).toBe("ddbj-2024-01-02")
    expect(item?.title).toEqual({ ja: "ja タイトル", en: "EN title" })
    expect(item?.category).toBe("data-release")
    expect(item?.featured).toBe(false)
    expect(item?.url?.ja).toContain("/news/ja/2024-01-02.html")
    expect(item?.url?.en).toContain("/news/en/2024-01-02-e.html")
  })

  test("toNewsItem_bothMissing_returnsUndefined", () => {
    expect(toNewsItem(ddbjCfg, undefined, undefined)).toBeUndefined()
  })

  test("toNewsItem_missingDateAndNoFallback_returnsUndefined", () => {
    const broken: RawArticle = { ...ja, fm: { title: "x" } }
    expect(toNewsItem(ddbjCfg, broken, undefined)).toBeUndefined()
  })

  test("toNewsItem_jaOnly_enTitleIsEmpty", () => {
    const item = toNewsItem(ddbjCfg, ja, undefined)
    expect(item?.title.ja).toBe("ja タイトル")
    expect(item?.title.en).toBe("")
    expect(item?.url?.en).toBeUndefined()
  })

  test("toNewsItem_dbclsMissingDate_derivesPublishedAtFromSlug", () => {
    const dbclsJa: RawArticle = {
      source: "dbcls",
      lang: "ja",
      slug: "2026-05-01-post1",
      fm: { title: "DBCLS post" },
      body: "",
    }
    const item = toNewsItem(dbclsCfg, dbclsJa, undefined)
    expect(item?.id).toBe("dbcls-2026-05-01-post1")
    expect(item?.publishedAt).toBe("2026-05-01T00:00:00+09:00")
  })

  test("toNewsItem_publishedFalse_returnsUndefined", () => {
    const drafted: RawArticle = {
      source: "dbcls",
      lang: "ja",
      slug: "2026-05-02-post1",
      fm: { title: "draft", published: "false" },
      body: "",
    }
    expect(toNewsItem(dbclsCfg, drafted, undefined)).toBeUndefined()
  })
})
