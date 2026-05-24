import { QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { I18nextProvider } from "react-i18next"
import { createRoutesStub } from "react-router"
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest"

import type { NewsList } from "~/lib/api/news"
import type * as I18nModule from "~/lib/i18n"
import { createI18nInstance, useLang } from "~/lib/i18n"
import { createQueryClient } from "~/lib/query/client"
import { NotificationBar } from "~/shell/notification-bar"

import { server } from "../mocks/server"

vi.mock("~/lib/i18n", async () => {
  const actual = await vi.importActual<typeof I18nModule>("~/lib/i18n")
  return { ...actual, useLang: vi.fn(() => "ja" as const) }
})

const renderBar = (lang: "ja" | "en" = "ja") => {
  vi.mocked(useLang).mockReturnValue(lang)
  const i18n = createI18nInstance(lang)
  const queryClient = createQueryClient()
  const Stub = createRoutesStub([
    { path: "/*", Component: () => <NotificationBar /> },
  ])
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <Stub initialEntries={["/"]} />
      </I18nextProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  window.sessionStorage.clear()
})

afterEach(() => {
  window.sessionStorage.clear()
  vi.mocked(useLang).mockReturnValue("ja")
})

const announcementList: NewsList = [
  {
    id: "ann-1",
    source: "ddbj",
    category: "announcement",
    publishedAt: "2026-05-23T12:00:00Z",
    title: { ja: "アナウンス 1", en: "Announcement 1" },
    url: "https://example.com/ann-1",
  },
  {
    id: "ann-2",
    source: "ddbj",
    category: "announcement",
    publishedAt: "2026-05-24T12:00:00Z",
    title: { ja: "アナウンス 2", en: "Announcement 2" },
    url: "https://example.com/ann-2",
  },
  {
    id: "release-1",
    source: "ddbj",
    category: "release",
    publishedAt: "2026-05-22T12:00:00Z",
    title: { ja: "リリース", en: "Release" },
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
})
