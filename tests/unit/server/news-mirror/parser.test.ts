import { describe, expect, it } from "vitest"

import { parseNewsFile, renderMarkdown } from "@/server/news-mirror/parser"

const SAMPLE_JA = `---
layout: simple
title: テストお知らせ
category: news
db:
  - ddbj
  - top
tags:
  - Announcement
date: 2026-04-08T09:00:00+09:00
retire_time: 2026-04-14T09:00:00+09:00
lang: ja
---

本文です。 [link](https://example.com).
`

describe("parseNewsFile", () => {
  it("parses YAML front matter and body", () => {
    const result = parseNewsFile("_news/ja/2026-04-08.md", "abc123", SAMPLE_JA, "ja")
    expect(result.slug).toBe("2026-04-08")
    expect(result.lang).toBe("ja")
    expect(result.filePath).toBe("_news/ja/2026-04-08.md")
    expect(result.data.title).toBe("テストお知らせ")
    expect(result.data.tags).toEqual(["Announcement"])
    expect(result.data.db).toEqual(["ddbj", "top"])
    expect(result.bodyMarkdown).toContain("本文です。")
  })

  it("strips -e suffix from en slug", () => {
    const result = parseNewsFile("_news/en/2026-04-08-e.md", "x", SAMPLE_JA.replace("lang: ja", "lang: en"), "en")
    expect(result.slug).toBe("2026-04-08")
    expect(result.lang).toBe("en")
  })

  it("keeps slug for en file without -e suffix (rare case)", () => {
    const result = parseNewsFile("_news/en/2026-04-08.md", "x", SAMPLE_JA, "en")
    expect(result.slug).toBe("2026-04-08")
  })
})

describe("renderMarkdown", () => {
  it("renders simple markdown to HTML", async () => {
    const html = await renderMarkdown("Hello **world**")
    expect(html).toContain("<strong>world</strong>")
  })

  it("allows safe links", async () => {
    const html = await renderMarkdown("[click](https://example.com)")
    expect(html).toContain("<a href=\"https://example.com\">click</a>")
  })

  it("sanitizes script tags", async () => {
    const html = await renderMarkdown("text <script>alert(1)</script> more")
    expect(html).not.toContain("<script>")
  })

  it("drops javascript: protocol on anchors", async () => {
    const html = await renderMarkdown("[bad](javascript:alert(1))")
    expect(html).not.toContain("javascript:")
  })
})
