import { screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { computeActiveNav, Header } from "~/shell/header"

import { renderWithStub } from "../_helpers/render"

const enHandle = { lang: "en" as const }

const renderHeader = (path: string) => {
  const isEn = path === "/en" || path.startsWith("/en/")

  return renderWithStub({
    routes: [
      { path: "/", Component: () => <Header /> },
      { path: "/search", Component: () => <Header /> },
      { path: "/search/results", Component: () => <Header /> },
      { path: "/en", handle: enHandle, Component: () => <Header /> },
      { path: "/en/search", handle: enHandle, Component: () => <Header /> },
      { path: "/en/submit", handle: enHandle, Component: () => <Header /> },
    ],
    initialEntries: [path],
    lang: isEn ? "en" : "ja",
  })
}

describe("Header", () => {
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
    renderHeader("/en")
    const search = screen.getByRole("link", { name: "Search" })
    const submit = screen.getByRole("link", { name: "Submit" })
    expect(search).toHaveAttribute("href", "/en/search")
    expect(submit).toHaveAttribute("href", "/en/submit")
  })

  test("Header_aboutUs_isExternalLink", () => {
    renderHeader("/")
    const about = screen.getByRole("link", { name: /About us/ })
    expect(about).toHaveAttribute("href", "https://bsi.rois.ac.jp")
    expect(about).toHaveAttribute("target", "_blank")
    expect(about).toHaveAttribute("rel", "noopener noreferrer")
  })
})

describe("computeActiveNav", () => {
  test("computeActiveNav_jaRoot_returnsNull", () => {
    expect(computeActiveNav("/", "ja")).toBe(null)
  })

  test("computeActiveNav_enRoot_returnsNull", () => {
    expect(computeActiveNav("/en", "en")).toBe(null)
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
