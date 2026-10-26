import { test } from "@fast-check/vitest"
import fc from "fast-check"
import { describe, expect } from "vitest"

import { renderRobotsTxt } from "../../../../server/api/robots"

const ORIGIN = "https://bsi.example.test"

// RFC 9309 の読み方で、robots.txt がある path を拒否するかを判定する。
// 一致する規則のうち最も長いものが勝ち、規則は前方一致で、同じ長さなら
// Allow が勝つ。生成する robots.txt にワイルドカードは無い。
const blocked = (robots: string, path: string): boolean => {
  const rules = robots.split("\n").flatMap((line) => {
    const [field, ...rest] = line.split(":")
    const value = rest.join(":").trim()
    if (field === "Allow") return [{ allow: true, path: value }]
    if (field === "Disallow" && value !== "") return [{ allow: false, path: value }]

    return []
  })
  const matching = rules.filter((rule) => path.startsWith(rule.path))
  const longest = Math.max(-1, ...matching.map((rule) => rule.path.length))
  const winners = matching.filter((rule) => rule.path.length === longest)

  return winners.length > 0 && !winners.some((rule) => rule.allow)
}

const PRODUCTION = renderRobotsTxt({ isProduction: true, origin: ORIGIN })
const STAGING = renderRobotsTxt({ isProduction: false, origin: ORIGIN })

const arbQuery = fc.webQueryParameters({ size: "small" })
const arbSegment = fc.stringMatching(/^[a-z][a-z0-9-]{0,11}$/)
const arbPath = fc.array(arbSegment, { minLength: 0, maxLength: 3 }).map((segments) => `/${segments.join("/")}`)
const arbPathWithQuery = fc.tuple(arbPath, arbQuery).map(([path, query]) => (query === "" ? path : `${path}?${query}`))

describe("renderRobotsTxt PBT", () => {
  test.prop([arbQuery])("production_searchResultsWithAnyQuery_isBlocked", (query) => {
    expect(blocked(PRODUCTION, `/search/results?${query}`)).toBe(true)
    expect(blocked(PRODUCTION, "/search/results")).toBe(true)
  })

  test.prop([arbSegment, arbQuery])("production_anyAuthEndpoint_isBlocked", (segment, query) => {
    expect(blocked(PRODUCTION, `/api/auth/${segment}`)).toBe(true)
    expect(blocked(PRODUCTION, `/api/auth/${segment}?${query}`)).toBe(true)
  })

  test.prop([arbPathWithQuery])("production_pathOutsideClosedPrefixes_isNotBlocked", (path) => {
    fc.pre(!path.startsWith("/search/results") && !path.startsWith("/api/auth/"))
    expect(blocked(PRODUCTION, path)).toBe(false)
  })

  test.prop([arbQuery])("production_searchBuilderAndListingsWithQuery_areNotBlocked", (query) => {
    // 検索のビルダー、news と services の一覧は条件が有限なので拒否しない。
    for (const path of ["/search", "/news", "/services", "/"]) {
      expect([path, blocked(PRODUCTION, `${path}?${query}`)]).toEqual([path, false])
    }
  })

  test.prop([arbQuery])("staging_llmsAndPublicEndpointsWithAnyQuery_areNotBlocked", (query) => {
    for (const path of ["/llms.txt", "/api/news", "/api/services"]) {
      expect([path, blocked(STAGING, path)]).toEqual([path, false])
      expect([path, blocked(STAGING, `${path}?${query}`)]).toEqual([path, false])
    }
  })

  test.prop([arbPathWithQuery])("staging_pathOutsideOpenPrefixes_isBlocked", (path) => {
    fc.pre(!["/llms.txt", "/api/news", "/api/services"].some((open) => path.startsWith(open)))
    expect(blocked(STAGING, path)).toBe(true)
  })

  test.prop([arbQuery])("staging_pagesAndSitemapAndAuth_areBlocked", (query) => {
    for (const path of ["/", "/search", "/bioproject", "/sitemap.xml", "/api/me", "/api/auth/login", "/api/llm/health"]) {
      expect([path, blocked(STAGING, path)]).toEqual([path, true])
      expect([path, blocked(STAGING, `${path}?${query}`)]).toEqual([path, true])
    }
  })
})
