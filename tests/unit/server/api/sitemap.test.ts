import type { Request, Response } from "express"
import { describe, expect, test, vi } from "vitest"

import { buildSitemapEntries, handleSitemap, renderSitemapXml } from "../../../../server/api/sitemap"
import type { ServerEnv } from "../../../../server/lib/env"

describe("buildSitemapEntries", () => {
  test("buildSitemapEntries_emitsJaAndEnQueryUrlsForEachPath", () => {
    const entries = buildSitemapEntries("https://portal.ddbj.nig.ac.jp", ["/bioproject", "/biosample"])
    const locs = entries.map((e) => e.loc)

    expect(locs).toContain("https://portal.ddbj.nig.ac.jp/?lang=ja")
    expect(locs).toContain("https://portal.ddbj.nig.ac.jp/?lang=en")
    expect(locs).toContain("https://portal.ddbj.nig.ac.jp/search?lang=ja")
    expect(locs).toContain("https://portal.ddbj.nig.ac.jp/search?lang=en")
    expect(locs).toContain("https://portal.ddbj.nig.ac.jp/submit?lang=ja")
    expect(locs).toContain("https://portal.ddbj.nig.ac.jp/submit?lang=en")
    expect(locs).toContain("https://portal.ddbj.nig.ac.jp/news?lang=ja")
    expect(locs).toContain("https://portal.ddbj.nig.ac.jp/news?lang=en")
    expect(locs).toContain("https://portal.ddbj.nig.ac.jp/bioproject?lang=ja")
    expect(locs).toContain("https://portal.ddbj.nig.ac.jp/bioproject?lang=en")
    expect(locs).toContain("https://portal.ddbj.nig.ac.jp/biosample?lang=ja")
    expect(locs).toContain("https://portal.ddbj.nig.ac.jp/biosample?lang=en")
  })

  // feature page は content collection から自動列挙されないので、 静的一覧の
  // 取りこぼしがそのまま索引漏れになる。
  test("buildSitemapEntries_coversEveryFeaturePage", () => {
    const locs = buildSitemapEntries("https://portal.ddbj.nig.ac.jp", []).map((e) => e.loc)

    for (const path of ["/services", "/docs", "/contact"]) {
      expect(locs).toContain(`https://portal.ddbj.nig.ac.jp${path}?lang=ja`)
      expect(locs).toContain(`https://portal.ddbj.nig.ac.jp${path}?lang=en`)
    }
  })

  test("buildSitemapEntries_emitsTwoEntriesPerLogicalPath", () => {
    const entries = buildSitemapEntries("https://portal.ddbj.nig.ac.jp", ["/a", "/b", "/c"])
    expect(entries).toHaveLength((7 + 3) * 2)
  })

  test("buildSitemapEntries_trimsTrailingSlashOnOrigin", () => {
    const entries = buildSitemapEntries("https://portal.ddbj.nig.ac.jp/", [])
    const locs = entries.map((e) => e.loc)
    expect(locs).toContain("https://portal.ddbj.nig.ac.jp/?lang=ja")
  })

  test("buildSitemapEntries_emptySlugs_emitsOnlyStaticPaths", () => {
    const entries = buildSitemapEntries("https://example.com", [])
    expect(entries).toHaveLength(7 * 2)
  })

  test("buildSitemapEntries_eachEntry_carriesJaEnXDefaultAlternates", () => {
    const entries = buildSitemapEntries("https://example.com", [])
    for (const entry of entries) {
      const hreflangs = entry.alternates.map((a) => a.hreflang).sort()
      expect(hreflangs).toEqual(["en", "ja", "x-default"])
    }
  })

  test("buildSitemapEntries_xDefaultAlternate_matchesJaUrl", () => {
    const entries = buildSitemapEntries("https://example.com", [])
    for (const entry of entries) {
      const ja = entry.alternates.find((a) => a.hreflang === "ja")
      const xDefault = entry.alternates.find((a) => a.hreflang === "x-default")
      expect(xDefault?.href).toBe(ja?.href)
    }
  })
})

describe("renderSitemapXml", () => {
  test("renderSitemapXml_emitsXhtmlNamespacedEnvelope", () => {
    const xml = renderSitemapXml([])
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/)
    expect(xml).toContain("xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\"")
    expect(xml).toContain("xmlns:xhtml=\"http://www.w3.org/1999/xhtml\"")
    expect(xml).toContain("</urlset>")
  })

  test("renderSitemapXml_emitsLocAndAlternateLinksPerEntry", () => {
    const xml = renderSitemapXml([
      {
        loc: "https://example.com/?lang=ja",
        alternates: [
          { hreflang: "ja", href: "https://example.com/?lang=ja" },
          { hreflang: "en", href: "https://example.com/?lang=en" },
          { hreflang: "x-default", href: "https://example.com/?lang=ja" },
        ],
      },
    ])
    expect(xml).toContain("<loc>https://example.com/?lang=ja</loc>")
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="ja" href="https://example.com/?lang=ja"/>')
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="en" href="https://example.com/?lang=en"/>')
    expect(xml).toContain('<xhtml:link rel="alternate" hreflang="x-default" href="https://example.com/?lang=ja"/>')
  })

  test("renderSitemapXml_escapesAmpersandsAndAngleBrackets", () => {
    const xml = renderSitemapXml([
      {
        loc: "https://example.com/?q=a&b=<c>&lang=ja",
        alternates: [],
      },
    ])
    expect(xml).toContain("?q=a&amp;b=&lt;c&gt;&amp;lang=ja")
    expect(xml).not.toContain("?q=a&b=<c>")
  })

  test("renderSitemapXml_emptyEntries_emitsBareEnvelope", () => {
    const xml = renderSitemapXml([])
    expect(xml).toContain("<urlset")
    expect(xml).toContain("</urlset>")
    expect(xml).not.toContain("<loc>")
    expect(xml).not.toContain("<xhtml:link")
  })
})

describe("buildSitemapEntries lastmod", () => {
  test("buildSitemapEntries_lastUpdatedForPath_setsLastmodPerLanguage", () => {
    const entries = buildSitemapEntries("https://example.com", ["/bioproject"], {
      "/bioproject": { ja: "2026-06-29T13:25:19+09:00", en: "2026-07-01T00:00:00+09:00" },
    })
    const ja = entries.find((e) => e.loc === "https://example.com/bioproject?lang=ja")
    const en = entries.find((e) => e.loc === "https://example.com/bioproject?lang=en")

    expect(ja?.lastmod).toBe("2026-06-29T13:25:19+09:00")
    expect(en?.lastmod).toBe("2026-07-01T00:00:00+09:00")
  })

  test("buildSitemapEntries_lastUpdatedWithoutEn_omitsLastmodOnEnUrl", () => {
    // index.en.md が無いページは en の URL も並べるが、en の更新日は無い。
    const entries = buildSitemapEntries("https://example.com", ["/policy"], {
      "/policy": { ja: "2026-06-29T13:25:19+09:00" },
    })
    const ja = entries.find((e) => e.loc === "https://example.com/policy?lang=ja")
    const en = entries.find((e) => e.loc === "https://example.com/policy?lang=en")

    expect(ja?.lastmod).toBe("2026-06-29T13:25:19+09:00")
    expect(en).toBeDefined()
    expect(en && "lastmod" in en).toBe(false)
  })

  test("buildSitemapEntries_noLastUpdated_omitsLastmodEverywhere", () => {
    const entries = buildSitemapEntries("https://example.com", ["/a", "/b"])

    for (const entry of entries) expect("lastmod" in entry).toBe(false)
  })

  test("buildSitemapEntries_lastUpdatedForPathNotListed_isIgnored", () => {
    const entries = buildSitemapEntries("https://example.com", ["/a"], {
      "/_dev/markdown-showcase": { ja: "2026-06-29T22:07:19+09:00" },
    })

    expect(entries.map((e) => e.loc)).not.toContain("https://example.com/_dev/markdown-showcase?lang=ja")
    for (const entry of entries) expect("lastmod" in entry).toBe(false)
  })

  test("buildSitemapEntries_pathWithTrailingSlash_matchesLastUpdatedByNormalizedPath", () => {
    const entries = buildSitemapEntries("https://example.com", ["/a/"], {
      "/a": { ja: "2026-06-29T13:25:19+09:00" },
    })
    const ja = entries.find((e) => e.loc === "https://example.com/a?lang=ja")

    expect(ja?.lastmod).toBe("2026-06-29T13:25:19+09:00")
  })
})

describe("renderSitemapXml lastmod", () => {
  test("renderSitemapXml_entryWithLastmod_emitsLastmodBetweenLocAndAlternates", () => {
    const xml = renderSitemapXml([
      {
        loc: "https://example.com/a?lang=ja",
        lastmod: "2026-06-29T13:25:19+09:00",
        alternates: [{ hreflang: "ja", href: "https://example.com/a?lang=ja" }],
      },
    ])

    expect(xml).toContain([
      "  <url>",
      "    <loc>https://example.com/a?lang=ja</loc>",
      "    <lastmod>2026-06-29T13:25:19+09:00</lastmod>",
      '    <xhtml:link rel="alternate" hreflang="ja" href="https://example.com/a?lang=ja"/>',
      "  </url>",
    ].join("\n"))
  })

  test("renderSitemapXml_entryWithoutLastmod_omitsLastmodElement", () => {
    const xml = renderSitemapXml([{ loc: "https://example.com/a?lang=ja", alternates: [] }])

    expect(xml).not.toContain("<lastmod>")
  })

  test("renderSitemapXml_lastmodWithMarkup_isEscaped", () => {
    const xml = renderSitemapXml([{ loc: "https://example.com/", lastmod: "<bad>&", alternates: [] }])

    expect(xml).toContain("<lastmod>&lt;bad&gt;&amp;</lastmod>")
  })
})

type Sent = { statusCode: number | undefined; contentType: string | undefined; body: string | undefined }

const fakeResponse = (): { res: Response; sent: Sent } => {
  const sent: Sent = { statusCode: undefined, contentType: undefined, body: undefined }
  const res = {
    status(code: number): Response {
      sent.statusCode = code

      return res
    },
    type(value: string): Response {
      sent.contentType = value

      return res
    },
    set(): Response {
      return res
    },
    send(body: string): Response {
      sent.body = body

      return res
    },
  } as unknown as Response

  return { res, sent }
}

describe("handleSitemap", () => {
  // 検索エンジンに載せない配置では sitemap を 404 にする。production の応答は
  // page-contents/ を実際に読むので、staging の e2e ではなく production の
  // smoke で確認する。
  test.each(["dev", "staging"] as const)("handleSitemap_%s_responds404PlainText", async (envName) => {
    const env = { DB_PORTAL_ENV: envName, DB_PORTAL_PORTAL_ORIGIN: "https://example.com" } as ServerEnv
    const { res, sent } = fakeResponse()
    await handleSitemap(env)({} as Request, res, vi.fn())

    expect(sent.statusCode).toBe(404)
    expect(sent.contentType).toBe("text/plain")
    expect(sent.body).not.toContain("<urlset")
  })
})
