import { describe, expect, it } from "vitest"

import { EMPTY_TOP_NEWS, parseGlobalYaml } from "@/server/news-mirror/top-news"

const SAMPLE = `top_news:
 ja:
    - title: DDBJ リリース 141.0
      path: 2026-04-08
    - title: ゴールデンウィーク中の対応について
      path: 2026-04-03
    - title: INSDC minimal specifications
      path: 2026-03-19
 en:
    - title: DDBJ Rel. 141.0
      path: 2026-04-08-e
    - title: Golden Week
      path: 2026-04-03-e
    - title: INSDC Minimal Specifications
      path: 2026-03-19-e
`

describe("parseGlobalYaml", () => {
  it("parses ja paths into a Set", () => {
    const result = parseGlobalYaml(SAMPLE)
    expect(result.ja.has("2026-04-08")).toBe(true)
    expect(result.ja.has("2026-04-03")).toBe(true)
    expect(result.ja.has("2026-03-19")).toBe(true)
    expect(result.ja.size).toBe(3)
  })

  it("strips -e suffix from en paths to align with ja slugs", () => {
    const result = parseGlobalYaml(SAMPLE)
    expect(result.en.has("2026-04-08")).toBe(true)
    expect(result.en.has("2026-03-19")).toBe(true)
    expect(result.en.has("2026-04-08-e")).toBe(false)
  })

  it("returns empty config for missing top_news", () => {
    expect(parseGlobalYaml("other: foo").ja.size).toBe(0)
    expect(parseGlobalYaml("").ja.size).toBe(0)
  })

  it("returns empty config for malformed yaml", () => {
    expect(parseGlobalYaml("top_news: [not an object]").ja.size).toBe(0)
  })

  it("ignores entries without path", () => {
    const result = parseGlobalYaml(`top_news:
 ja:
    - title: ok
      path: 2026-04-08
    - title: missing path
`)
    expect(result.ja.size).toBe(1)
  })

  it("EMPTY_TOP_NEWS is empty for both langs", () => {
    expect(EMPTY_TOP_NEWS.ja.size).toBe(0)
    expect(EMPTY_TOP_NEWS.en.size).toBe(0)
  })
})
