import type { Request, Response } from "express"
import { describe, expect, test, vi } from "vitest"

import { handleRobots, renderRobotsTxt } from "../../../../server/api/robots"
import type { ServerEnv } from "../../../../server/lib/env"

const ORIGIN = "https://bsi.example.test"

describe("renderRobotsTxt", () => {
  test("renderRobotsTxt_production_disallowsSearchResultsAndAuthAndAdvertisesSitemap", () => {
    expect(renderRobotsTxt({ isProduction: true, origin: ORIGIN })).toBe([
      "User-agent: *",
      "Disallow: /search/results",
      "Disallow: /api/auth/",
      "",
      `Sitemap: ${ORIGIN}/sitemap.xml`,
      "",
    ].join("\n"))
  })

  test("renderRobotsTxt_production_trimsTrailingSlashOnOrigin", () => {
    const txt = renderRobotsTxt({ isProduction: true, origin: `${ORIGIN}/` })

    expect(txt).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`)
    expect(txt).not.toContain(`${ORIGIN}//`)
  })

  test("renderRobotsTxt_nonProduction_allowsLlmsAndPublicEndpointsBeforeDisallowingAll", () => {
    expect(renderRobotsTxt({ isProduction: false, origin: ORIGIN })).toBe([
      "User-agent: *",
      "Allow: /llms.txt",
      "Allow: /api/news",
      "Allow: /api/services",
      "Disallow: /",
      "",
    ].join("\n"))
  })

  test("renderRobotsTxt_nonProduction_omitsSitemap", () => {
    expect(renderRobotsTxt({ isProduction: false, origin: ORIGIN })).not.toContain("Sitemap")
  })

  test("renderRobotsTxt_production_doesNotAllowExplicitly", () => {
    // 本番は既定で全て許可するので、Allow 行があると意味が変わる。
    expect(renderRobotsTxt({ isProduction: true, origin: ORIGIN })).not.toContain("Allow:")
  })
})

type Sent = { contentType: string | undefined; headers: Record<string, string>; body: string | undefined }

const fakeResponse = (): { res: Response; sent: Sent } => {
  const sent: Sent = { contentType: undefined, headers: {}, body: undefined }
  const res = {
    type(value: string): Response {
      sent.contentType = value

      return res
    },
    set(name: string, value: string): Response {
      sent.headers[name] = value

      return res
    },
    send(body: string): Response {
      sent.body = body

      return res
    },
  } as unknown as Response

  return { res, sent }
}

const envOf = (env: ServerEnv["DB_PORTAL_ENV"]): ServerEnv =>
  ({ DB_PORTAL_ENV: env, DB_PORTAL_PORTAL_ORIGIN: ORIGIN }) as ServerEnv

describe("handleRobots", () => {
  test("handleRobots_production_sendsPlainTextWithSitemap", () => {
    const { res, sent } = fakeResponse()
    handleRobots(envOf("production"))({} as Request, res, vi.fn())

    expect(sent.contentType).toBe("text/plain")
    expect(sent.headers["Cache-Control"]).toBe("public, max-age=3600")
    expect(sent.body).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`)
  })

  test("handleRobots_staging_sendsDisallowAll", () => {
    const { res, sent } = fakeResponse()
    handleRobots(envOf("staging"))({} as Request, res, vi.fn())

    expect(sent.body).toContain("Disallow: /\n")
    expect(sent.body).not.toContain("Sitemap")
  })
})
