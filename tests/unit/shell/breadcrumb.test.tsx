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
        path: lang === "en" ? "/en" : "/",
        handle: { lang },
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

  test("Breadcrumb_databasesPath_rendersHomeAndCurrent", () => {
    renderBreadcrumb(["/databases"], "ja")
    const nav = screen.getByRole("navigation", { name: "パンくずリスト" })
    expect(nav).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "ホーム" })).toHaveAttribute("href", "/")
    expect(screen.getByText("データベース")).toHaveAttribute("aria-current", "page")
  })

  test("Breadcrumb_databasesPath_separatorBetweenItems", () => {
    const { container } = renderBreadcrumb(["/databases"], "ja")
    const separators = container.querySelectorAll("span[aria-hidden='true']")
    expect(separators.length).toBeGreaterThan(0)
  })

  test("Breadcrumb_homeLink_appliesIntermediateStyle", () => {
    renderBreadcrumb(["/databases"], "ja")
    const homeLink = screen.getByRole("link", { name: "ホーム" })
    expect(homeLink).toHaveClass("text-ink-mid", "no-underline", "hover:underline")
  })

  test("Breadcrumb_currentItem_isMarkedAriaCurrentPage", () => {
    renderBreadcrumb(["/databases"], "ja")
    const current = screen.getByText("データベース")
    expect(current).toHaveAttribute("aria-current", "page")
    expect(current).toHaveClass("text-ink", "font-semibold")
  })

  test("Breadcrumb_enLang_homeHrefIsEn", () => {
    renderBreadcrumb(["/en/databases"], "en")
    expect(screen.getByRole("link", { name: /Home/i })).toHaveAttribute("href", "/en")
  })

  test("Breadcrumb_nav_isWrappedWithMaxContentAndPadding", () => {
    const { container } = renderBreadcrumb(["/databases"], "ja")
    const nav = container.querySelector("nav")
    expect(nav).toHaveClass("max-w-content-max", "mx-auto", "px-page-gutter", "py-3")
  })

  test("Breadcrumb_listItems_renderedAsOl", () => {
    const { container } = renderBreadcrumb(["/databases"], "ja")
    const ol = container.querySelector("ol")
    expect(ol).toHaveClass("flex", "items-center", "gap-1.5", "list-none", "text-fs-body-sm")
  })

  test("Breadcrumb_unknownDatabaseSlug_resolverReturnsNull", () => {
    renderBreadcrumb(["/databases/__non_existent__"], "ja")
    expect(screen.queryByText("__non_existent__")).toBeNull()
    expect(screen.getByText("データベース")).toHaveAttribute("aria-current", "page")
  })
})
