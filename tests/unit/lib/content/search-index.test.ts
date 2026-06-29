import { describe, expect, test } from "vitest"

import { searchContent } from "~/lib/content/search-index"

describe("searchContent — base behavior", () => {
  test("emptyQuery_returnsNoResults", () => {
    expect(searchContent("", "ja")).toEqual([])
    expect(searchContent("   ", "ja")).toEqual([])
  })

  test("knownPageTitle_returnsPageHit", () => {
    const results = searchContent("BioProject", "ja")
    const pageHit = results.find((r) =>
      r.kind === "page" && r.pageUrlPath === "/bioproject",
    )
    expect(pageHit).toBeDefined()
    expect(pageHit?.urlPath).toBe("/bioproject")
    expect(pageHit?.title).toBe("BioProject")
    expect(pageHit?.section).toBe("bioproject")
    expect(pageHit?.anchor).toBeUndefined()
  })

  test("h2Heading_returnsSectionHitWithAnchor", () => {
    // "受け付けるデータ" is an h2 in /bioproject (page-contents/bioproject/index.md)
    const results = searchContent("受け付けるデータ", "ja")
    const sectionHit = results.find((r) =>
      r.kind === "section" && r.pageUrlPath === "/bioproject",
    )
    expect(sectionHit).toBeDefined()
    expect(sectionHit?.anchor).toBeDefined()
    expect(sectionHit?.urlPath).toBe(
      `/bioproject#${sectionHit?.anchor ?? ""}`,
    )
    expect(sectionHit?.pageTitle).toBe("BioProject")
    expect(sectionHit?.title).toContain("受け付けるデータ")
  })

  test("sectionHits_urlPath_combinesPageAndAnchor", () => {
    const results = searchContent("プロジェクト", "ja")
    const sectionHits = results.filter((r) => r.kind === "section")
    expect(sectionHits.length).toBeGreaterThan(0)
    for (const r of sectionHits) {
      expect(r.anchor).toBeDefined()
      expect(r.urlPath).toBe(`${r.pageUrlPath}#${r.anchor}`)
    }
  })

  test("pageHits_urlPath_equalsPageUrlPath_andHaveNoAnchor", () => {
    const results = searchContent("プロジェクト", "ja")
    const pageHits = results.filter((r) => r.kind === "page")
    expect(pageHits.length).toBeGreaterThan(0)
    for (const r of pageHits) {
      expect(r.urlPath).toBe(r.pageUrlPath)
      expect(r.anchor).toBeUndefined()
    }
  })

  test("snippet_isNonEmpty_forKnownHit", () => {
    const results = searchContent("BioProject", "ja")
    expect(results.length).toBeGreaterThan(0)
    for (const r of results) {
      expect(r.snippet.length).toBeGreaterThan(0)
    }
  })

  test("unknownTerm_returnsEmptyArray", () => {
    const results = searchContent("zzzzzzzzzznevermatches", "ja")
    expect(results).toEqual([])
  })
})

describe("searchContent — i18n", () => {
  test("englishQuery_onEnIndex_returnsEnglishTitles", () => {
    const results = searchContent("BioProject", "en")
    const pageHit = results.find((r) =>
      r.kind === "page" && r.pageUrlPath === "/bioproject",
    )
    expect(pageHit?.title).toBe("BioProject")
    expect(pageHit?.pageTitle).toBe("BioProject")
  })
})

describe("searchContent — devPages excluded", () => {
  test("noResults_targetDevPagesPath", () => {
    const results = searchContent("markdown showcase", "ja")
    for (const r of results) {
      expect(r.pageUrlPath.startsWith("/_dev")).toBe(false)
    }
  })
})
