import type { Request, Response } from "express"
import { describe, expect, test, vi } from "vitest"

import { handleLlms, PUBLIC_ENDPOINTS, renderLlmsText } from "../../../../server/api/llms"
import type { ServerEnv } from "../../../../server/lib/env"

const OPTS = {
  origin: "https://bsi.example.test",
  searchApiUrl: "https://search.example.test/search/api",
  openapiUrl: "https://search.example.test/search/api/openapi.json",
}

describe("renderLlmsText", () => {
  test("renderLlmsText_opensWithTitleBlankLineAndBlockquote", () => {
    const [title, blank, summary] = renderLlmsText(OPTS).split("\n")

    expect(title).toBe("# BSI")
    expect(blank).toBe("")
    expect(summary?.startsWith("> ")).toBe(true)
  })

  test("renderLlmsText_linksSearchApiDocsAndOpenapi", () => {
    const text = renderLlmsText(OPTS)

    expect(text).toContain("(https://search.example.test/search/api/docs)")
    expect(text).toContain("(https://search.example.test/search/api/openapi.json)")
  })

  test("renderLlmsText_listsEveryPublicEndpointAsLinkOnOrigin", () => {
    const text = renderLlmsText(OPTS)

    for (const endpoint of PUBLIC_ENDPOINTS) {
      expect(text).toContain(
        `- [${endpoint.method} ${endpoint.path}](${OPTS.origin}${endpoint.path}): ${endpoint.summary}`,
      )
    }
  })

  test("renderLlmsText_trailingSlashOnOriginAndSearchApi_doesNotDoubleSlash", () => {
    const text = renderLlmsText({
      ...OPTS,
      origin: `${OPTS.origin}/`,
      searchApiUrl: `${OPTS.searchApiUrl}/`,
    })

    expect(text).toContain(`(${OPTS.origin}/api/news)`)
    expect(text).toContain(`(${OPTS.searchApiUrl}/docs)`)
    expect(text).not.toContain("//api/")
    expect(text).not.toContain("//docs")
  })

  test("renderLlmsText_everyLinkTarget_isAbsoluteHttpUrl", () => {
    const text = renderLlmsText(OPTS)
    const targets = [...text.matchAll(/\]\(([^)]*)\)/g)].map((m) => m[1] ?? "")

    expect(targets.length).toBeGreaterThan(0)
    for (const target of targets) {
      expect(() => new URL(target)).not.toThrow()
      expect(/^https?:$/.test(new URL(target).protocol)).toBe(true)
    }
  })

  test("renderLlmsText_endsWithNewline", () => {
    expect(renderLlmsText(OPTS).endsWith("\n")).toBe(true)
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

describe("handleLlms", () => {
  test("handleLlms_sendsMarkdownBuiltFromEnv", () => {
    const env = {
      DB_PORTAL_PORTAL_ORIGIN: OPTS.origin,
      DB_PORTAL_SEARCH_API_URL: OPTS.searchApiUrl,
      DB_PORTAL_OPENAPI_URL: OPTS.openapiUrl,
    } as ServerEnv
    const { res, sent } = fakeResponse()
    handleLlms(env)({} as Request, res, vi.fn())

    expect(sent.contentType).toBe("text/markdown")
    expect(sent.headers["Cache-Control"]).toBe("public, max-age=3600")
    expect(sent.body).toBe(renderLlmsText(OPTS))
  })
})
