import { describe, expect, test } from "vitest"

import { renderRobotsTxt } from "../../../../server/api/robots"

describe("renderRobotsTxt", () => {
  test("renderRobotsTxt_production_allowsAllAndAdvertisesSitemap", () => {
    const txt = renderRobotsTxt({
      isProduction: true,
      origin: "https://portal.ddbj.nig.ac.jp",
    })

    expect(txt).toContain("User-agent: *")
    expect(txt).toContain("Allow: /")
    expect(txt).toContain("Sitemap: https://portal.ddbj.nig.ac.jp/sitemap.xml")
    expect(txt).not.toContain("Disallow: /")
  })

  test("renderRobotsTxt_production_trimsTrailingSlashOnOrigin", () => {
    const txt = renderRobotsTxt({
      isProduction: true,
      origin: "https://portal.ddbj.nig.ac.jp/",
    })

    expect(txt).toContain("Sitemap: https://portal.ddbj.nig.ac.jp/sitemap.xml")
  })

  test("renderRobotsTxt_nonProduction_disallowsAllAndOmitsSitemap", () => {
    const txt = renderRobotsTxt({
      isProduction: false,
      origin: "https://portal-staging.ddbj.nig.ac.jp",
    })

    expect(txt).toContain("User-agent: *")
    expect(txt).toContain("Disallow: /")
    expect(txt).not.toContain("Allow: /")
    expect(txt).not.toContain("Sitemap:")
  })

  test("renderRobotsTxt_endsWithNewline", () => {
    const txtA = renderRobotsTxt({ isProduction: true, origin: "https://x" })
    const txtB = renderRobotsTxt({ isProduction: false, origin: "https://x" })
    expect(txtA.endsWith("\n")).toBe(true)
    expect(txtB.endsWith("\n")).toBe(true)
  })
})
