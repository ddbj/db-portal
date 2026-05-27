import { screen, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { describe, expect, test } from "vitest"

import type { NewsList } from "~/lib/api/news"
import { NewsAside } from "~/shell/news-aside"

import { createNoRetryClient, renderWithStub } from "../_helpers/render"
import { server } from "../mocks/server"

const renderAside = (lang: "ja" | "en" = "ja") =>
  renderWithStub({
    routes: [
      { path: "/", Component: () => <NewsAside /> },
      { path: "/en", handle: { lang: "en" as const }, Component: () => <NewsAside /> },
    ],
    initialEntries: [lang === "en" ? "/en" : "/"],
    lang,
    queryClient: createNoRetryClient(),
  })

const makeNews = (count: number): NewsList =>
  Array.from({ length: count }, (_, i) => ({
    id: `n-${i + 1}`,
    source: "ddbj" as const,
    category: "data-release" as const,
    featured: false,
    publishedAt: `2026-05-${String(24 - i).padStart(2, "0")}T00:00:00Z`,
    title: { ja: `お知らせ ${i + 1}`, en: `Announcement ${i + 1}` },
    db: [],
    rawTags: { ja: [], en: [] },
  }))

describe("NewsAside", () => {
  test("NewsAside_top5_areShown_evenWhenMoreAvailable", async () => {
    server.use(http.get("*/api/news", () => HttpResponse.json(makeNews(12))))
    renderAside()
    await waitFor(() => {
      expect(screen.getByText("お知らせ 1")).toBeInTheDocument()
    })
    expect(screen.getByText("お知らせ 5")).toBeInTheDocument()
    expect(screen.queryByText("お知らせ 6")).toBeNull()
  })

  test("NewsAside_empty_showsEmptyMessage", async () => {
    server.use(http.get("*/api/news", () => HttpResponse.json([])))
    renderAside()
    await waitFor(() => {
      expect(screen.getByText("新着のお知らせはありません")).toBeInTheDocument()
    })
  })

  test("NewsAside_jaLang_viewAllPointsToJaNews", async () => {
    server.use(http.get("*/api/news", () => HttpResponse.json(makeNews(2))))
    renderAside("ja")
    await waitFor(() => screen.getByText("お知らせ 1"))
    const headingLink = screen.getAllByRole("link", { name: /すべて見る/ })[0]
    expect(headingLink).toHaveAttribute("href", "/news")
  })

  test("NewsAside_enLang_viewAllPointsToNews", async () => {
    server.use(http.get("*/api/news", () => HttpResponse.json(makeNews(2))))
    renderAside("en")
    await waitFor(() => screen.getByText("Announcement 1"))
    const headingLink = screen.getAllByRole("link", { name: /View all/ })[0]
    expect(headingLink).toHaveAttribute("href", "/news")
  })

  test("NewsAside_apiError_showsEmptyMessage", async () => {
    server.use(http.get("*/api/news", () => HttpResponse.json(
      { error: "boom" },
      { status: 500 },
    )))
    renderAside()
    await waitFor(() => {
      expect(screen.getByText("新着のお知らせはありません")).toBeInTheDocument()
    })
    expect(screen.queryByRole("status")).toBeNull()
  })

  test("NewsAside_pendingFetch_showsLoadingStatus", async () => {
    server.use(http.get("*/api/news", () => new Promise<Response>(() => undefined)))
    renderAside()
    const status = await screen.findByRole("status")
    expect(status).toHaveTextContent("読み込み中")
    expect(screen.queryByText("お知らせ 1")).toBeNull()
  })

  test("NewsAside_singleItem_hasNoBottomBorder", async () => {
    server.use(http.get("*/api/news", () => HttpResponse.json(makeNews(1))))
    const { container } = renderAside()
    await waitFor(() => screen.getByText("お知らせ 1"))
    const items = container.querySelectorAll("aside ul > li")
    expect(items).toHaveLength(1)
    expect(items[0]).not.toHaveClass("border-b")
  })

  test("NewsAside_multipleItems_lastHasNoBottomBorder", async () => {
    server.use(http.get("*/api/news", () => HttpResponse.json(makeNews(3))))
    const { container } = renderAside()
    await waitFor(() => screen.getByText("お知らせ 3"))
    const items = container.querySelectorAll("aside ul > li")
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveClass("border-b")
    expect(items[1]).toHaveClass("border-b")
    expect(items[2]).not.toHaveClass("border-b")
  })
})
