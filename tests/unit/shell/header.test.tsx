import { screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { computeActiveNav, Header } from "~/shell/header"

import { renderWithStub } from "../_helpers/render"

const renderHeader = (path: string, lang: "ja" | "en" = "ja") =>
  renderWithStub({
    routes: [
      { path: "/", Component: () => <Header /> },
      { path: "/search", Component: () => <Header /> },
      { path: "/search/results", Component: () => <Header /> },
      { path: "/submit", Component: () => <Header /> },
    ],
    initialEntries: [path],
    lang,
  })

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

  test("Header_navHrefs_areLangNeutral", () => {
    renderHeader("/", "en")
    const search = screen.getByRole("link", { name: "Search" })
    const submit = screen.getByRole("link", { name: "Submit" })
    expect(search).toHaveAttribute("href", "/search")
    expect(submit).toHaveAttribute("href", "/submit")
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
  test("computeActiveNav_root_returnsNull", () => {
    expect(computeActiveNav("/")).toBe(null)
  })

  test("computeActiveNav_searchResults_returnsSearch", () => {
    expect(computeActiveNav("/search/results")).toBe("search")
  })

  test("computeActiveNav_databases_returnsNull", () => {
    expect(computeActiveNav("/databases/bioproject")).toBe(null)
  })

  test("computeActiveNav_submit_returnsSubmit", () => {
    expect(computeActiveNav("/submit")).toBe("submit")
  })

  test("computeActiveNav_searchOnlyMatchesPrefix_notSearchSimilar", () => {
    expect(computeActiveNav("/searches")).toBe(null)
  })
})
