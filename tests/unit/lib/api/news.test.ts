import { http, HttpResponse } from "msw"
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
