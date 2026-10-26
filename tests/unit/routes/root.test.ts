import { afterEach, describe, expect, test, vi } from "vitest"

import { loader, meta } from "~/root"

type MetaInput = Parameters<typeof meta>[0]
type LoaderInput = Parameters<typeof loader>[0]

const metaOf = (noindex: boolean) =>
  meta({
    loaderData: { lang: "ja", cspNonce: "", portalOrigin: "https://example.com", noindex },
    location: { pathname: "/search", search: "?q=x", hash: "", state: null, key: "k" },
    matches: [],
    params: {},
  } as unknown as MetaInput)

describe("root meta", () => {
  test("meta_noindexTrue_emitsRobotsNoindex", () => {
    expect(metaOf(true)).toContainEqual({ name: "robots", content: "noindex" })
  })

  test("meta_noindexFalse_omitsRobotsTag", () => {
    const robots = metaOf(false).filter((tag) => "name" in tag && tag.name === "robots")

    expect(robots).toEqual([])
  })

  test("meta_noindexTrue_keepsHreflangAlternatesWithQuery", () => {
    const tags = metaOf(true)

    expect(tags).toContainEqual({
      tagName: "link",
      rel: "alternate",
      hrefLang: "ja",
      href: "https://example.com/search?q=x&lang=ja",
    })
    expect(tags).toContainEqual({
      tagName: "link",
      rel: "alternate",
      hrefLang: "x-default",
      href: "https://example.com/search?q=x&lang=ja",
    })
  })
})

describe("root loader", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  // staging と dev には production と同じ内容があるので、production だけを
  // 検索エンジンに載せる。
  test.each([
    ["dev", true],
    ["staging", true],
    ["production", false],
  ] as const)("loader_env_%s_noindexIs_%s", async (envName, expected) => {
    vi.stubEnv("DB_PORTAL_ENV", envName)
    vi.stubEnv("DB_PORTAL_PORTAL_ORIGIN", "https://example.com")
    const url = "https://example.com/"
    const request = new Request(url, { headers: { Cookie: "db_portal_lang=ja" } })
    const result = await loader({ request, url, params: {}, context: {} } as unknown as LoaderInput)

    expect((result as { data: { noindex: boolean } }).data.noindex).toBe(expected)
  })

  test("loader_envUnset_noindexIsTrue", async () => {
    vi.stubEnv("DB_PORTAL_ENV", "")
    const url = "https://example.com/"
    const request = new Request(url, { headers: { Cookie: "db_portal_lang=ja" } })
    const result = await loader({ request, url, params: {}, context: {} } as unknown as LoaderInput)

    expect((result as { data: { noindex: boolean } }).data.noindex).toBe(true)
  })
})
