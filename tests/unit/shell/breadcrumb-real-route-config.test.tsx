import { screen, within } from "@testing-library/react"
import { Outlet } from "react-router"
import { describe, expect, test } from "vitest"

import { Breadcrumb } from "~/shell/breadcrumb"

import { renderWithStub } from "../_helpers/render"

// app/routes.ts と同じ構造をミラーリング。docs layout (handle: docs-root) の
// 配下に catch-all `*` → page-content/route.tsx (handle: page-content) が並ぶ。
// docs root resolver は breadcrumb の起点「ホーム」 を /docs 指しで出す。
// page-content resolver は URL を segment 単位で分解し、各 segment の page を
// 見つけて breadcrumb 配列を返す。なので /bioproject の trail は
// ホーム (/docs) > BioProject の 2 段。
const renderRealPageContentRoute = (
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

describe("Breadcrumb real route config", () => {
  test("Breadcrumb_pageContent_ja_rendersHomeThenDbTitle", () => {
    renderRealPageContentRoute(["/bioproject"], "ja")

    const nav = screen.getByRole("navigation", { name: "パンくずリスト" })
    const crumbs = within(nav).getAllByRole("listitem")
    expect(crumbs).toHaveLength(2)

    expect(within(nav).getByRole("link", { name: "ホーム" })).toHaveAttribute("href", "/docs")

    const current = within(nav).getByText("BioProject")
    expect(current).toHaveAttribute("aria-current", "page")
    expect(current.tagName).toBe("SPAN")
  })

  test("Breadcrumb_pageContent_en_rendersHomeThenDbTitle", () => {
    renderRealPageContentRoute(["/biosample"], "en")

    const nav = screen.getByRole("navigation", { name: "Breadcrumb" })
    const crumbs = within(nav).getAllByRole("listitem")
    expect(crumbs).toHaveLength(2)

    expect(within(nav).getByRole("link", { name: "Home" })).toHaveAttribute("href", "/docs")

    const current = within(nav).getByText("BioSample")
    expect(current).toHaveAttribute("aria-current", "page")
  })

  test("Breadcrumb_nestedPageContent_rendersAllAncestorCrumbs", () => {
    renderRealPageContentRoute(["/policy/term-of-use"], "ja")

    const nav = screen.getByRole("navigation", { name: "パンくずリスト" })
    const crumbs = within(nav).getAllByRole("listitem")
    expect(crumbs).toHaveLength(3)

    expect(within(nav).getByRole("link", { name: "ホーム" })).toHaveAttribute("href", "/docs")
    expect(within(nav).getByRole("link", { name: "BSI ウェブサイトポリシー" })).toHaveAttribute(
      "href",
      "/policy",
    )

    const current = within(nav).getByText("利用規約")
    expect(current).toHaveAttribute("aria-current", "page")
  })

  test("Breadcrumb_pageContent_separatorBetweenCrumbs", () => {
    const { container } = renderRealPageContentRoute(["/bioproject"], "ja")

    const items = container.querySelectorAll("ol > li")
    const separators = container.querySelectorAll("ol > li > span[aria-hidden='true']")
    expect(items).toHaveLength(2)
    expect(separators).toHaveLength(items.length - 1)
    separators.forEach((sep) => {
      expect(sep).toHaveTextContent("›")
    })
  })

  test("Breadcrumb_unknownPath_lastCrumbFallsBackToSegment", () => {
    renderRealPageContentRoute(["/__not_a_real_page__"], "ja")

    const nav = screen.getByRole("navigation", { name: "パンくずリスト" })
    const current = within(nav).getByText("__not_a_real_page__")
    expect(current).toHaveAttribute("aria-current", "page")
  })
})
