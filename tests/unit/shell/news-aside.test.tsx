import { QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { I18nextProvider } from "react-i18next"
import { createRoutesStub } from "react-router"
import { describe, expect, test } from "vitest"

import type { NewsList } from "~/lib/api/news"
import { createI18nInstance } from "~/lib/i18n"
import { createQueryClient } from "~/lib/query/client"
import { NewsAside } from "~/shell/news-aside"

import { server } from "../mocks/server"

const renderAside = (lang: "ja" | "en" = "ja") => {
  const i18n = createI18nInstance(lang)
  const queryClient = createQueryClient()
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => <NewsAside />,
    },
    {
      path: "/en",
      handle: { lang: "en" as const },
      Component: () => <NewsAside />,
    },
  ])

  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <Stub initialEntries={[lang === "en" ? "/en" : "/"]} />
      </I18nextProvider>
    </QueryClientProvider>,
  )
}

const makeNews = (count: number): NewsList =>
  Array.from({ length: count }, (_, i) => ({
    id: `n-${i + 1}`,
    source: "ddbj" as const,
    category: "release" as const,
    publishedAt: `2026-05-${String(24 - i).padStart(2, "0")}T00:00:00Z`,
    title: { ja: `お知らせ ${i + 1}`, en: `Announcement ${i + 1}` },
  }))

describe("NewsAside", () => {
  test("NewsAside_top8_areShown_evenWhenMoreAvailable", async () => {
    server.use(http.get("*/api/news", () => HttpResponse.json(makeNews(12))))
    renderAside()
    await waitFor(() => {
      expect(screen.getByText("お知らせ 1")).toBeInTheDocument()
    })
    expect(screen.getByText("お知らせ 8")).toBeInTheDocument()
    expect(screen.queryByText("お知らせ 9")).toBeNull()
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

  test("NewsAside_enLang_viewAllPointsToEnNews", async () => {
    server.use(http.get("*/api/news", () => HttpResponse.json(makeNews(2))))
    renderAside("en")
    await waitFor(() => screen.getByText("Announcement 1"))
    const headingLink = screen.getAllByRole("link", { name: /View all/ })[0]
    expect(headingLink).toHaveAttribute("href", "/en/news")
  })
})
