import { describe, expect, test } from "vitest"

import { buildSitemapEntries, renderSitemapXml } from "../../../../server/api/sitemap"

describe("buildSitemapEntries", () => {
  test("buildSitemapEntries_emitsJaAndEnForEachPath", () => {
    const urls = buildSitemapEntries("https://portal.ddbj.nig.ac.jp", ["bioproject", "biosample"])

    expect(urls).toContain("https://portal.ddbj.nig.ac.jp/")
    expect(urls).toContain("https://portal.ddbj.nig.ac.jp/en")
    expect(urls).toContain("https://portal.ddbj.nig.ac.jp/search")
    expect(urls).toContain("https://portal.ddbj.nig.ac.jp/en/search")
    expect(urls).toContain("https://portal.ddbj.nig.ac.jp/submit")
    expect(urls).toContain("https://portal.ddbj.nig.ac.jp/en/submit")
    expect(urls).toContain("https://portal.ddbj.nig.ac.jp/news")
    expect(urls).toContain("https://portal.ddbj.nig.ac.jp/en/news")
    expect(urls).toContain("https://portal.ddbj.nig.ac.jp/databases/bioproject")
    expect(urls).toContain("https://portal.ddbj.nig.ac.jp/en/databases/bioproject")
    expect(urls).toContain("https://portal.ddbj.nig.ac.jp/databases/biosample")
    expect(urls).toContain("https://portal.ddbj.nig.ac.jp/en/databases/biosample")
  })

  test("buildSitemapEntries_emitsTwoUrlsPerLogicalPath", () => {
    const urls = buildSitemapEntries("https://portal.ddbj.nig.ac.jp", ["a", "b", "c"])
    expect(urls).toHaveLength((4 + 3) * 2)
  })

  test("buildSitemapEntries_trimsTrailingSlashOnOrigin", () => {
    const urls = buildSitemapEntries("https://portal.ddbj.nig.ac.jp/", [])
    expect(urls).toContain("https://portal.ddbj.nig.ac.jp/")
  })

  test("buildSitemapEntries_emptySlugs_emitsOnlyStaticPaths", () => {
    const urls = buildSitemapEntries("https://example.com", [])
    expect(urls).toHaveLength(4 * 2)
  })
})

describe("renderSitemapXml", () => {
  test("renderSitemapXml_emitsValidEnvelope", () => {
    const xml = renderSitemapXml(["https://example.com/", "https://example.com/x"])
    expect(xml).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/)
    expect(xml).toContain("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">")
    expect(xml).toContain("<loc>https://example.com/</loc>")
    expect(xml).toContain("<loc>https://example.com/x</loc>")
    expect(xml).toContain("</urlset>")
  })

  test("renderSitemapXml_escapesAmpersandsAndAngleBrackets", () => {
    const xml = renderSitemapXml(["https://example.com/?q=a&b=<c>"])
    expect(xml).toContain("?q=a&amp;b=&lt;c&gt;")
    expect(xml).not.toContain("?q=a&b=<c>")
  })

  test("renderSitemapXml_emptyUrls_emitsBareEnvelope", () => {
    const xml = renderSitemapXml([])
    expect(xml).toContain("<urlset")
    expect(xml).toContain("</urlset>")
    expect(xml).not.toContain("<loc>")
  })
})
