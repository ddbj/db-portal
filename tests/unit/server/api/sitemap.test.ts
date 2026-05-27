import { describe, expect, test } from "vitest"

import { buildSitemapEntries, renderSitemapXml } from "../../../../server/api/sitemap"

describe("buildSitemapEntries", () => {
  test("buildSitemapEntries_emitsJaAndEnQueryUrlsForEachPath", () => {
    const entries = buildSitemapEntries("https://portal.ddbj.nig.ac.jp", ["bioproject", "biosample"])
    const locs = entries.map((e) => e.loc)

    expect(locs).toContain("https://portal.ddbj.nig.ac.jp/?lang=ja")
    expect(locs).toContain("https://portal.ddbj.nig.ac.jp/?lang=en")
    expect(locs).toContain("https://portal.ddbj.nig.ac.jp/search?lang=ja")
    expect(locs).toContain("https://portal.ddbj.nig.ac.jp/search?lang=en")
    expect(locs).toContain("https://portal.ddbj.nig.ac.jp/submit?lang=ja")
    expect(locs).toContain("https://portal.ddbj.nig.ac.jp/submit?lang=en")
    expect(locs).toContain("https://portal.ddbj.nig.ac.jp/news?lang=ja")
    expect(locs).toContain("https://portal.ddbj.nig.ac.jp/news?lang=en")
    expect(locs).toContain("https://portal.ddbj.nig.ac.jp/databases/bioproject?lang=ja")
    expect(locs).toContain("https://portal.ddbj.nig.ac.jp/databases/bioproject?lang=en")
    expect(locs).toContain("https://portal.ddbj.nig.ac.jp/databases/biosample?lang=ja")
    expect(locs).toContain("https://portal.ddbj.nig.ac.jp/databases/biosample?lang=en")
  })

  test("buildSitemapEntries_emitsTwoEntriesPerLogicalPath", () => {
    const entries = buildSitemapEntries("https://portal.ddbj.nig.ac.jp", ["a", "b", "c"])
    expect(entries).toHaveLength((4 + 3) * 2)
  })

  test("buildSitemapEntries_trimsTrailingSlashOnOrigin", () => {
    const entries = buildSitemapEntries("https://portal.ddbj.nig.ac.jp/", [])
    const locs = entries.map((e) => e.loc)
    expect(locs).toContain("https://portal.ddbj.nig.ac.jp/?lang=ja")
  })

  test("buildSitemapEntries_emptySlugs_emitsOnlyStaticPaths", () => {
    const entries = buildSitemapEntries("https://example.com", [])
    expect(entries).toHaveLength(4 * 2)
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
