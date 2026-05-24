import { QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import { I18nextProvider } from "react-i18next"
import { createRoutesStub } from "react-router"
import { afterEach, describe, expect, test, vi } from "vitest"

import type * as I18nModule from "~/lib/i18n"
import { createI18nInstance, useLang } from "~/lib/i18n"
import { createQueryClient } from "~/lib/query/client"
import { computeActiveNav, Header } from "~/shell/header"

import { server } from "../mocks/server"

vi.mock("~/lib/i18n", async () => {
  const actual = await vi.importActual<typeof I18nModule>("~/lib/i18n")
  return { ...actual, useLang: vi.fn(() => "ja" as const) }
})

afterEach(() => {
  vi.mocked(useLang).mockReturnValue("ja")
})

const renderHeader = (path: string, lang: "ja" | "en" = "ja") => {
  vi.mocked(useLang).mockReturnValue(lang)
  server.use(http.get("/api/me", () => HttpResponse.json(null, { status: 401 })))
  const i18n = createI18nInstance(lang)
  const queryClient = createQueryClient()
  const Stub = createRoutesStub([
    { path: "/*", Component: () => <Header /> },
  ])
  return render(
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <Stub initialEntries={[path]} />
      </I18nextProvider>
    </QueryClientProvider>,
  )
}

describe("Header", () => {
  test("Header_jaRoot_topIsActive", () => {
    renderHeader("/")
    const top = screen.getByRole("link", { name: "トップ" })
    expect(top).toHaveAttribute("aria-current", "page")
  })

  test("Header_searchPath_searchIsActive", () => {
    renderHeader("/search")
    const search = screen.getByRole("link", { name: "検索" })
    expect(search).toHaveAttribute("aria-current", "page")
  })

  test("Header_searchResultsPath_searchIsActiveByPrefix", () => {
    renderHeader("/search/results")
    const search = screen.getByRole("link", { name: "検索" })
    expect(search).toHaveAttribute("aria-current", "page")
  })

  test("Header_enRoot_navHrefsArePrefixed", () => {
    renderHeader("/en", "en")
    const top = screen.getByRole("link", { name: "Top" })
    const search = screen.getByRole("link", { name: "Search" })
    expect(top).toHaveAttribute("href", "/en")
    expect(search).toHaveAttribute("href", "/en/search")
  })
})

describe("computeActiveNav", () => {
  test("computeActiveNav_jaRoot_returnsTop", () => {
    expect(computeActiveNav("/", "ja")).toBe("top")
  })

  test("computeActiveNav_enRoot_returnsTop", () => {
    expect(computeActiveNav("/en", "en")).toBe("top")
  })

  test("computeActiveNav_searchResultsJa_returnsSearch", () => {
    expect(computeActiveNav("/search/results", "ja")).toBe("search")
  })

  test("computeActiveNav_databasesJa_returnsNull", () => {
    expect(computeActiveNav("/databases/bioproject", "ja")).toBe(null)
  })

  test("computeActiveNav_enSubmit_returnsSubmit", () => {
    expect(computeActiveNav("/en/submit", "en")).toBe("submit")
  })

  test("computeActiveNav_searchOnlyMatchesPrefix_notSearchSimilar", () => {
    expect(computeActiveNav("/searches", "ja")).toBe(null)
  })
})
