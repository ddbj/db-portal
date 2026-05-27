import { screen } from "@testing-library/react"
import { Outlet } from "react-router"
import { describe, expect, test } from "vitest"

import { Breadcrumb } from "~/shell/breadcrumb"

import { renderWithStub } from "../_helpers/render"

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
            path: "databases",
            handle: { breadcrumbI18nKey: "breadcrumb.databases" },
            Component: () => <Outlet />,
            children: [
              {
                path: ":slug",
                handle: { breadcrumbResolver: "database-content" },
                Component: () => <span>db</span>,
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

  test("Breadcrumb_databasesPath_rendersHomeLinkAndCurrentMarker", () => {
    renderBreadcrumb(["/databases"], "ja")
    expect(screen.getByRole("navigation", { name: "パンくずリスト" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "ホーム" })).toHaveAttribute("href", "/")
    const current = screen.getByText("データベース")
    expect(current).toHaveAttribute("aria-current", "page")
    expect(current.tagName).toBe("SPAN")
    expect(screen.queryByRole("link", { name: "データベース" })).toBeNull()
  })

  test("Breadcrumb_databasesPath_separatorMatchesItemCountMinusOne", () => {
    const { container } = renderBreadcrumb(["/databases"], "ja")
    const items = container.querySelectorAll("ol > li")
    const separators = container.querySelectorAll("ol > li > span[aria-hidden='true']")
    expect(separators).toHaveLength(items.length - 1)
    separators.forEach((sep) => {
      expect(sep).toHaveTextContent("›")
    })
  })

  test("Breadcrumb_enLang_homeHrefIsRoot", () => {
    renderBreadcrumb(["/databases"], "en")
    expect(screen.getByRole("link", { name: /Home/i })).toHaveAttribute("href", "/")
  })

  test("Breadcrumb_unknownDatabaseSlug_resolverReturnsNull", () => {
    renderBreadcrumb(["/databases/__non_existent__"], "ja")
    expect(screen.queryByText("__non_existent__")).toBeNull()
    expect(screen.getByText("データベース")).toHaveAttribute("aria-current", "page")
  })
})
