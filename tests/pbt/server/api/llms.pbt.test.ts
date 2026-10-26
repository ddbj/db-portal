import { test } from "@fast-check/vitest"
import fc from "fast-check"
import { describe, expect } from "vitest"

import { PUBLIC_ENDPOINTS, renderLlmsText } from "../../../../server/api/llms"

const arbOrigin = fc.webUrl({ withFragments: false, withQueryParameters: false })
  .map((url) => new URL(url).origin)
const arbSearchApi = fc.tuple(arbOrigin, fc.stringMatching(/^(\/[a-z]{1,8}){0,3}$/))
  .map(([origin, path]) => `${origin}${path}`)

const linkTargets = (text: string): string[] =>
  [...text.matchAll(/\]\(([^)]*)\)/g)].map((m) => m[1] ?? "")

describe("renderLlmsText PBT", () => {
  test.prop([arbOrigin, arbSearchApi])("anyOriginAndSearchApi_everyLinkIsOnOneOfThem", (origin, searchApi) => {
    const openapiUrl = `${searchApi}/openapi.json`
    const text = renderLlmsText({ origin, searchApiUrl: searchApi, openapiUrl })
    const targets = linkTargets(text)

    expect(targets).toContain(`${searchApi}/docs`)
    expect(targets).toContain(openapiUrl)
    for (const endpoint of PUBLIC_ENDPOINTS) expect(targets).toContain(`${origin}${endpoint.path}`)
    for (const target of targets) {
      expect(target.startsWith(`${origin}/`) || target.startsWith(`${searchApi}/`)).toBe(true)
    }
  })

  test.prop([arbOrigin, arbSearchApi])("anyOriginAndSearchApi_linkCountIsSearchLinksPlusEndpoints", (origin, searchApi) => {
    const text = renderLlmsText({ origin, searchApiUrl: searchApi, openapiUrl: `${searchApi}/openapi.json` })

    expect(linkTargets(text)).toHaveLength(2 + PUBLIC_ENDPOINTS.length)
  })

  test.prop([arbOrigin, arbSearchApi])("trailingSlashOnInputs_doesNotChangeLinks", (origin, searchApi) => {
    const openapiUrl = `${searchApi}/openapi.json`
    const plain = renderLlmsText({ origin, searchApiUrl: searchApi, openapiUrl })
    const slashed = renderLlmsText({ origin: `${origin}/`, searchApiUrl: `${searchApi}/`, openapiUrl })

    expect(slashed).toBe(plain)
  })
})
