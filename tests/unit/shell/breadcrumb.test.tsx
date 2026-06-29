import { screen } from "@testing-library/react"
import { Outlet } from "react-router"
import { describe, expect, test } from "vitest"

import { Breadcrumb } from "~/shell/breadcrumb"

import { renderWithStub } from "../_helpers/render"

// docs-root (handle 静的なシンボル) と page-content (handle 動的 resolver) を
// 組み合わせて、ja/en 双方の crumb をテストする。
const renderBreadcrumb = (
  initialEntries: string[],
  lang: "ja" | "en" = "ja",
) =>
  renderWithStub({
    routes: [
      {
        path: "/",
        Component: () => (
          <>
            <Breadcrumb />
            <Outlet />
          </>
        ),
        children: [
          {
            handle: { breadcrumbResolver: "docs-root" },
            Component: () => <Outlet />,
            children: [
              {
                path: "*",
                handle: { breadcrumbResolver: "page-content" },
                Component: () => <span>page</span>,
              },
            ],
          },
        ],
      },
    ],
    initialEntries,
    lang,
  })

describe("Breadcrumb", () => {
  test("Breadcrumb_topLevel_noCrumb_doesNotRender", () => {
    const { container } = renderWithStub({
      routes: [{ path: "/", Component: () => <Breadcrumb /> }],
      initialEntries: ["/"],
      lang: "ja",
    })
    expect(container.querySelector("nav")).toBeNull()
  })

  test("Breadcrumb_knownPage_rendersHomeDocsAndCurrent", () => {
    renderBreadcrumb(["/bioproject"], "ja")
    expect(screen.getByRole("navigation", { name: "パンくずリスト" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "ホーム" })).toHaveAttribute("href", "/")
    expect(screen.getByRole("link", { name: "ナレッジベース" })).toHaveAttribute("href", "/docs")
    const current = screen.getByText("BioProject")
    expect(current).toHaveAttribute("aria-current", "page")
    expect(current.tagName).toBe("SPAN")
  })

  test("Breadcrumb_knownPage_separatorMatchesItemCountMinusOne", () => {
    const { container } = renderBreadcrumb(["/bioproject"], "ja")
    const items = container.querySelectorAll("ol > li")
    const separators = container.querySelectorAll("ol > li > span[aria-hidden='true']")
    expect(separators).toHaveLength(items.length - 1)
    separators.forEach((sep) => {
      expect(sep).toHaveTextContent("›")
    })
  })

  test("Breadcrumb_enLang_homeAndDocsLabelsAreEnglish", () => {
    renderBreadcrumb(["/bioproject"], "en")
    expect(screen.getByRole("link", { name: /Home/i })).toHaveAttribute("href", "/")
    expect(screen.getByRole("link", { name: "Knowledge Base" })).toHaveAttribute("href", "/docs")
  })

  test("Breadcrumb_unknownPath_fallsBackToSegmentLabel", () => {
    renderBreadcrumb(["/__non_existent__"], "ja")
    expect(screen.getByText("__non_existent__")).toHaveAttribute("aria-current", "page")
  })
})
