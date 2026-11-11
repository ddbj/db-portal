import { http, HttpResponse } from "msw/http"
import { describe, expect, test } from "vitest"

import { APIError } from "~/lib/api/errors"
import { fetchNews } from "~/lib/api/news"

import { server } from "../../mocks/server"

const validItem = {
  id: "n-1",
  source: "ddbj",
  category: "announcement",
  publishedAt: "2026-05-21T10:00:00Z",
  title: { ja: "お知らせ", en: "Announcement" },
  db: [],
  rawTags: { ja: [], en: [] },
}

describe("fetchNews", () => {
  test("fetchNews_validJson_returnsList", async () => {
    server.use(
      http.get("http://localhost/api/news", () => HttpResponse.json([validItem])),
    )
    const list = await fetchNews({ baseUrl: "http://localhost" })
    expect(list).toHaveLength(1)
    expect(list[0]?.category).toBe("announcement")
  })

  test("fetchNews_emptyArray_returnsEmpty", async () => {
    server.use(
      http.get("http://localhost/api/news", () => HttpResponse.json([])),
    )
    const list = await fetchNews({ baseUrl: "http://localhost" })
    expect(list).toEqual([])
  })

  test("fetchNews_invalidShape_throwsZodError", async () => {
    server.use(
      http.get("http://localhost/api/news", () =>
        HttpResponse.json([{ ...validItem, category: "unknown" }]),
      ),
    )
    await expect(fetchNews({ baseUrl: "http://localhost" })).rejects.toThrow()
  })

  test("fetchNews_noQuery_requestsWithoutSearchParams", async () => {
    const urls: string[] = []
    server.use(
      http.get("http://localhost/api/news", ({ request }) => {
        urls.push(request.url)

        return HttpResponse.json([])
      }),
    )
    await fetchNews({ baseUrl: "http://localhost" })
    expect(urls).toEqual(["http://localhost/api/news"])
  })

  test("fetchNews_featuredTrue_sendsFeaturedTrue", async () => {
    const urls: URL[] = []
    server.use(
      http.get("http://localhost/api/news", ({ request }) => {
        urls.push(new URL(request.url))

        return HttpResponse.json([])
      }),
    )
    await fetchNews({ baseUrl: "http://localhost", query: { featured: true } })
    expect(urls[0]?.searchParams.get("featured")).toBe("true")
    expect(urls[0]?.searchParams.has("limit")).toBe(false)
  })

  test("fetchNews_featuredFalse_omitsFeatured", async () => {
    const urls: URL[] = []
    server.use(
      http.get("http://localhost/api/news", ({ request }) => {
        urls.push(new URL(request.url))

        return HttpResponse.json([])
      }),
    )
    await fetchNews({ baseUrl: "http://localhost", query: { featured: false } })
    expect(urls[0]?.search).toBe("")
  })

  test("fetchNews_limit_sendsLimit", async () => {
    const urls: URL[] = []
    server.use(
      http.get("http://localhost/api/news", ({ request }) => {
        urls.push(new URL(request.url))

        return HttpResponse.json([])
      }),
    )
    await fetchNews({ baseUrl: "http://localhost", query: { limit: 5 } })
    expect(urls[0]?.searchParams.get("limit")).toBe("5")
    expect(urls[0]?.searchParams.has("featured")).toBe(false)
  })

  test("fetchNews_responseError_throwsAPIError", async () => {
    server.use(
      http.get("http://localhost/api/news", () =>
        HttpResponse.json(
          { type: "https://errors.test/news", title: "boom" },
          { status: 503, headers: { "content-type": "application/problem+json" } },
        ),
      ),
    )
    await expect(fetchNews({ baseUrl: "http://localhost" })).rejects.toBeInstanceOf(APIError)
  })
})
