import { screen, within } from "@testing-library/react"
import { Outlet } from "react-router"
import { describe, expect, test } from "vitest"

import { Breadcrumb } from "~/shell/breadcrumb"

import { renderWithStub } from "../_helpers/render"

// Mirrors the real app/routes.ts: `databases/:slug` is a single flat route whose
// handle carries only `breadcrumbResolver: "database-content"`. There is no parent
// `databases` route contributing a static `breadcrumbI18nKey`, so the rendered trail
// is exactly two levels: Home > <database title> (no intermediate "データベース" crumb).
const renderRealDatabaseRoute = (
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
            path: "databases/:slug",
            handle: { breadcrumbResolver: "database-content" },
            Component: () => <span>db page</span>,
          },
        ],
      },
    ],
    initialEntries,
    lang,
  })

describe("Breadcrumb real route config", () => {
  test("Breadcrumb_flatDatabaseSlug_ja_rendersHomeThenDbTitleOnly", () => {
    const { container } = renderRealDatabaseRoute(["/databases/bioproject"], "ja")

    const nav = screen.getByRole("navigation", { name: "パンくずリスト" })
    const crumbs = within(nav).getAllByRole("listitem")
    expect(crumbs).toHaveLength(2)

    const home = within(nav).getByRole("link", { name: "ホーム" })
    expect(home).toHaveAttribute("href", "/")

    const current = within(nav).getByText("BioProject")
    expect(current).toHaveAttribute("aria-current", "page")
    expect(current.tagName).toBe("SPAN")

    // The flat route has no static parent crumb, so "データベース" must never appear.
    expect(within(nav).queryByText("データベース")).toBeNull()
    expect(within(container).queryByRole("link", { name: "BioProject" })).toBeNull()
  })

  test("Breadcrumb_flatDatabaseSlug_en_rendersHomeThenDbTitleOnly", () => {
    const { container } = renderRealDatabaseRoute(["/databases/biosample"], "en")

    const nav = screen.getByRole("navigation", { name: "Breadcrumb" })
    const crumbs = within(nav).getAllByRole("listitem")
    expect(crumbs).toHaveLength(2)

    expect(within(nav).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/")

    const current = within(nav).getByText("BioSample")
    expect(current).toHaveAttribute("aria-current", "page")
    expect(current.tagName).toBe("SPAN")

    expect(within(nav).queryByText("Databases")).toBeNull()
    expect(within(container).queryByText("データベース")).toBeNull()
  })

  test("Breadcrumb_flatDatabaseSlug_exactlyOneSeparatorBetweenTwoCrumbs", () => {
    const { container } = renderRealDatabaseRoute(["/databases/bioproject"], "ja")

    const items = container.querySelectorAll("ol > li")
    const separators = container.querySelectorAll("ol > li > span[aria-hidden='true']")
    expect(items).toHaveLength(2)
    expect(separators).toHaveLength(items.length - 1)
    separators.forEach((sep) => {
      expect(sep).toHaveTextContent("›")
    })
  })

  test("Breadcrumb_flatDatabaseSlug_currentCrumbHrefMatchesPathname", () => {
    renderRealDatabaseRoute(["/databases/bioproject"], "ja")

    // The resolver sets the crumb href to the match pathname, but the last crumb is a
    // non-link <span>, so only the Home link exposes an href in the trail.
    const links = screen.getAllByRole("link")
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute("href", "/")
  })

  test("Breadcrumb_unknownDatabaseSlug_resolverReturnsNull_noCrumbRendered", () => {
    const { container } = renderRealDatabaseRoute(["/databases/__not_a_real_db__"], "ja")

    // The only dynamic crumb resolves to null for an unknown slug, leaving just Home,
    // which the component suppresses (length <= 1 renders nothing).
    expect(container.querySelector("nav")).toBeNull()
    expect(screen.queryByText("__not_a_real_db__")).toBeNull()
    expect(screen.queryByText("データベース")).toBeNull()
  })
})
