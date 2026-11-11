import { act, fireEvent, screen, waitFor, within } from "@testing-library/react"
import { http, HttpResponse } from "msw/http"
import { beforeEach, describe, expect, test } from "vitest"

import type { NewsItem, NewsList } from "~/lib/api/news"
import { NotificationBar } from "~/shell/notification-bar"

import { createNoRetryClient, renderWithStub } from "../_helpers/render"
import { server } from "../mocks/server"

const renderBar = (lang: "ja" | "en" = "ja", path = "/") =>
  renderWithStub({
    routes: [
      { path: "/", Component: () => <NotificationBar /> },
      { path: "/search", Component: () => <NotificationBar /> },
    ],
    initialEntries: [path],
    lang,
    queryClient: createNoRetryClient(),
  })

const ann1: NewsItem = {
  id: "ann-1",
  source: "ddbj",
  category: "announcement",
  featured: true,
  publishedAt: "2026-05-23T12:00:00Z",
  title: { ja: "アナウンス 1", en: "Announcement 1" },
  url: { ja: "https://example.com/ann-1", en: "https://example.com/ann-1-e" },
  db: [],
  rawTags: { ja: ["お知らせ"], en: ["Announcement"] },
}

const ann2: NewsItem = {
  id: "ann-2",
  source: "ddbj",
  category: "announcement",
  featured: true,
  publishedAt: "2026-05-24T12:00:00Z",
  title: { ja: "アナウンス 2", en: "Announcement 2" },
  url: { ja: "https://example.com/ann-2", en: "https://example.com/ann-2-e" },
  db: [],
  rawTags: { ja: ["お知らせ"], en: ["Announcement"] },
}

// The BFF returns only featured items for `featured=true`.
const announcementList: NewsList = [ann1, ann2]

const closeArticle = (title: string) => {
  const article = screen.getByRole("article", { name: title })
  fireEvent.click(within(article).getByRole("button", { name: "通知を閉じる" }))
}

describe("NotificationBar", () => {
  beforeEach(() => {
    window.sessionStorage.clear()
  })

  test("NotificationBar_allFeatured_stackedNewestFirst", async () => {
    server.use(http.get("*/api/news", () => HttpResponse.json(announcementList)))
    renderBar()
    await waitFor(() => {
      expect(screen.getByText("アナウンス 2")).toBeInTheDocument()
    })
    const articles = screen.getAllByRole("article")
    expect(articles).toHaveLength(2)
    expect(articles[0]).toHaveAccessibleName("アナウンス 2")
    expect(articles[1]).toHaveAccessibleName("アナウンス 1")
  })

  test("NotificationBar_dismissOne_keepsOthersVisible", async () => {
    server.use(http.get("*/api/news", () => HttpResponse.json(announcementList)))
    renderBar()
    await waitFor(() => screen.getByText("アナウンス 2"))
    closeArticle("アナウンス 2")
    await waitFor(() => {
      expect(screen.queryByText("アナウンス 2")).toBeNull()
    })
    expect(screen.getByText("アナウンス 1")).toBeInTheDocument()
  })

  test("NotificationBar_dismissAll_hidesRegion", async () => {
    server.use(http.get("*/api/news", () => HttpResponse.json(announcementList)))
    renderBar()
    await waitFor(() => screen.getByText("アナウンス 2"))
    closeArticle("アナウンス 2")
    await waitFor(() => screen.queryByText("アナウンス 2") === null)
    closeArticle("アナウンス 1")
    await waitFor(() => {
      expect(screen.queryByRole("region")).toBeNull()
    })
  })

  test("NotificationBar_dismissMiddle_keepsTopAndBottom", async () => {
    const ann3: NewsItem = {
      id: "ann-3",
      source: "ddbj",
      category: "announcement",
      featured: true,
      publishedAt: "2026-05-22T08:00:00Z",
      title: { ja: "アナウンス 3", en: "Announcement 3" },
      db: [],
      rawTags: { ja: [], en: [] },
    }
    const threeAnnouncements: NewsList = [ann1, ann2, ann3]
    server.use(http.get("*/api/news", () => HttpResponse.json(threeAnnouncements)))
    renderBar()
    await waitFor(() => screen.getByText("アナウンス 2"))
    closeArticle("アナウンス 1")
    await waitFor(() => {
      expect(screen.queryByText("アナウンス 1")).toBeNull()
    })
    const remaining = screen.getAllByRole("article")
    expect(remaining).toHaveLength(2)
    expect(remaining[0]).toHaveAccessibleName("アナウンス 2")
    expect(remaining[1]).toHaveAccessibleName("アナウンス 3")
  })

  test("NotificationBar_noFeatured_rendersNothing", async () => {
    server.use(http.get("*/api/news", () => HttpResponse.json([])))
    const { container } = renderBar()
    await waitFor(() => {
      expect(container.textContent).toBe("")
    })
  })

  test("NotificationBar_dismissedIdPersisted_inSessionStorage", async () => {
    server.use(http.get("*/api/news", () => HttpResponse.json(announcementList)))
    renderBar()
    await waitFor(() => screen.getByText("アナウンス 2"))
    closeArticle("アナウンス 2")
    const raw = window.sessionStorage.getItem("dbPortal.notificationBar.dismissed")
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw ?? "[]") as string[]
    expect(parsed).toEqual(["ann-2"])
    expect(parsed).not.toContain("ann-1")
  })

  test("NotificationBar_priorDismissed_remainHiddenOnMount", async () => {
    window.sessionStorage.setItem(
      "dbPortal.notificationBar.dismissed",
      JSON.stringify(["ann-2"]),
    )
    server.use(http.get("*/api/news", () => HttpResponse.json(announcementList)))
    renderBar()
    await waitFor(() => {
      expect(screen.getByText("アナウンス 1")).toBeInTheDocument()
    })
    expect(screen.queryByText("アナウンス 2")).toBeNull()
    expect(screen.getAllByRole("article")).toHaveLength(1)
  })

  test("NotificationBar_enLang_showsAllEnTitles", async () => {
    server.use(http.get("*/api/news", () => HttpResponse.json(announcementList)))
    renderBar("en")
    await waitFor(() => {
      expect(screen.getByText("Announcement 2")).toBeInTheDocument()
    })
    expect(screen.getByText("Announcement 1")).toBeInTheDocument()
  })

  test("NotificationBar_apiError_rendersNothing", async () => {
    server.use(http.get("*/api/news", () => HttpResponse.json(
      { error: "boom" },
      { status: 500 },
    )))
    const { container } = renderBar()
    await waitFor(() => {
      expect(container.textContent).toBe("")
    })
    expect(screen.queryByRole("region")).toBeNull()
  })

  test("NotificationBar_topPath_requestsFeaturedOnlyWithoutLimit", async () => {
    const urls: URL[] = []
    server.use(http.get("*/api/news", ({ request }) => {
      urls.push(new URL(request.url))

      return HttpResponse.json(announcementList)
    }))
    renderBar()
    await waitFor(() => screen.getByText("アナウンス 2"))
    expect(urls).toHaveLength(1)
    expect(urls[0]?.searchParams.get("featured")).toBe("true")
    expect(urls[0]?.searchParams.has("limit")).toBe(false)
  })

  test("NotificationBar_nonTopPath_rendersNothingAndSkipsFetch", async () => {
    let requests = 0
    server.use(http.get("*/api/news", () => {
      requests += 1

      return HttpResponse.json(announcementList)
    }))
    const { container } = renderBar("ja", "/search")
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    expect(container.textContent).toBe("")
    expect(screen.queryByRole("region")).toBeNull()
    expect(requests).toBe(0)
  })
})
