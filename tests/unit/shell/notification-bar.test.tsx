import { act, fireEvent, screen, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { describe, expect, test } from "vitest"

import type { NewsList } from "~/lib/api/news"
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

const announcementList: NewsList = [
  {
    id: "ann-1",
    source: "ddbj",
    category: "announcement",
    featured: true,
    publishedAt: "2026-05-23T12:00:00Z",
    title: { ja: "アナウンス 1", en: "Announcement 1" },
    url: { ja: "https://example.com/ann-1", en: "https://example.com/ann-1-e" },
    db: [],
    rawTags: { ja: ["お知らせ"], en: ["Announcement"] },
  },
  {
    id: "ann-2",
    source: "ddbj",
    category: "announcement",
    featured: true,
    publishedAt: "2026-05-24T12:00:00Z",
    title: { ja: "アナウンス 2", en: "Announcement 2" },
    url: { ja: "https://example.com/ann-2", en: "https://example.com/ann-2-e" },
    db: [],
    rawTags: { ja: ["お知らせ"], en: ["Announcement"] },
  },
  {
    id: "release-1",
    source: "ddbj",
    category: "data-release",
    featured: false,
    publishedAt: "2026-05-22T12:00:00Z",
    title: { ja: "リリース", en: "Release" },
    db: [],
    rawTags: { ja: [], en: [] },
  },
]

describe("NotificationBar", () => {
  test("NotificationBar_newestAnnouncement_isShownFirst", async () => {
    server.use(http.get("*/api/news", () => HttpResponse.json(announcementList)))
    renderBar()
    await waitFor(() => {
      expect(screen.getByText("アナウンス 2")).toBeInTheDocument()
    })
    expect(screen.queryByText("アナウンス 1")).toBeNull()
  })

  test("NotificationBar_dismissNewest_showsNextAnnouncement", async () => {
    server.use(http.get("*/api/news", () => HttpResponse.json(announcementList)))
    renderBar()
    await waitFor(() => screen.getByText("アナウンス 2"))
    fireEvent.click(screen.getByRole("button", { name: "通知を閉じる" }))
    await waitFor(() => {
      expect(screen.getByText("アナウンス 1")).toBeInTheDocument()
    })
  })

  test("NotificationBar_dismissAll_hidesBar", async () => {
    server.use(http.get("*/api/news", () =>
      HttpResponse.json([announcementList[1]])),
    )
    renderBar()
    await waitFor(() => screen.getByText("アナウンス 2"))
    fireEvent.click(screen.getByRole("button", { name: "通知を閉じる" }))
    await waitFor(() => {
      expect(screen.queryByText("アナウンス 2")).toBeNull()
    })
  })

  test("NotificationBar_noAnnouncements_rendersNothing", async () => {
    server.use(http.get("*/api/news", () =>
      HttpResponse.json([announcementList[2]])),
    )
    const { container } = renderBar()
    await waitFor(() => {
      expect(container.textContent).toBe("")
    })
  })

  test("NotificationBar_dismissedIdPersisted_inSessionStorage", async () => {
    server.use(http.get("*/api/news", () => HttpResponse.json(announcementList)))
    renderBar()
    await waitFor(() => screen.getByText("アナウンス 2"))
    fireEvent.click(screen.getByRole("button", { name: "通知を閉じる" }))
    const raw = window.sessionStorage.getItem("dbPortal.notificationBar.dismissed")
    expect(raw).not.toBeNull()
    expect(JSON.parse(raw ?? "[]")).toContain("ann-2")
  })

  test("NotificationBar_enLang_showsEnTitle", async () => {
    server.use(http.get("*/api/news", () => HttpResponse.json(announcementList)))
    renderBar("en")
    await waitFor(() => {
      expect(screen.getByText("Announcement 2")).toBeInTheDocument()
    })
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

  test("NotificationBar_expiredFeatured_isFilteredOut", async () => {
    const expired: NewsList = [
      {
        id: "expired-1",
        source: "ddbj",
        category: "announcement",
        featured: true,
        publishedAt: "2026-05-23T12:00:00Z",
        retireTime: "2026-05-24T12:00:00Z",
        title: { ja: "期限切れ", en: "Expired" },
        db: [],
        rawTags: { ja: ["お知らせ"], en: ["Announcement"] },
      },
    ]
    server.use(http.get("*/api/news", () => HttpResponse.json(expired)))
    const { container } = renderBar()
    await waitFor(() => {
      expect(container.textContent).toBe("")
    })
  })

  test("NotificationBar_nonFeaturedItem_isFilteredOut", async () => {
    server.use(http.get("*/api/news", () =>
      HttpResponse.json([announcementList[2]])),
    )
    const { container } = renderBar()
    await waitFor(() => {
      expect(container.textContent).toBe("")
    })
    expect(screen.queryByText("リリース")).toBeNull()
  })

  test("NotificationBar_nonTopPath_rendersNothing", async () => {
    server.use(http.get("*/api/news", () => HttpResponse.json(announcementList)))
    const { container } = renderBar("ja", "/search")
    await act(async () => {
      await Promise.resolve()
    })
    expect(container.textContent).toBe("")
    expect(screen.queryByRole("region")).toBeNull()
  })
})
