import { screen, within } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { ServiceGrid } from "~/features/top/service-grid"
import { listServicesByTopCategory } from "~/lib/content"

import { renderWithStub } from "../../_helpers/render"

const renderGrid = (lang: "ja" | "en" = "ja") =>
  renderWithStub({
    routes: [
      { path: "/", Component: () => <ServiceGrid lang={lang} /> },
      { path: "/search", Component: () => <span>search</span> },
      { path: "/en/search", Component: () => <span>search-en</span> },
      { path: "/submit", Component: () => <span>submit</span> },
      { path: "/en/submit", Component: () => <span>submit-en</span> },
    ],
    initialEntries: ["/"],
    lang,
  })

describe("ServiceGrid", () => {
  test("ServiceGrid_primaryServices_areRenderedAsCards", () => {
    const services = listServicesByTopCategory("primary-service")
    expect(services.length).toBeGreaterThan(0)
    renderGrid()
    for (const service of services) {
      expect(screen.getByRole("heading", { level: 3, name: service.title.ja }))
        .toBeInTheDocument()
    }
  })

  test("ServiceGrid_rendersOneListItemPerService", () => {
    const services = listServicesByTopCategory("primary-service")
    const { container } = renderGrid()
    const items = container.querySelectorAll("ul > li")
    expect(items.length).toBe(services.length)
  })

  test("ServiceGrid_listClass_appliesGridResponsive", () => {
    const { container } = renderGrid()
    const ul = container.querySelector("ul")
    expect(ul).toHaveClass("grid", "sm:grid-cols-2", "gap-3", "list-none")
  })

  test("ServiceGrid_enLang_rendersEnglishTitles", () => {
    const services = listServicesByTopCategory("primary-service")
    renderGrid("en")
    for (const service of services) {
      expect(screen.getByRole("heading", { level: 3, name: service.title.en }))
        .toBeInTheDocument()
    }
  })

  test("ServiceGrid_orderedByTopOrder", () => {
    const services = listServicesByTopCategory("primary-service")
    const { container } = renderGrid()
    const headings = within(container).getAllByRole("heading", { level: 3 })
    const renderedTitles = headings.map((h) =>
      h.querySelector("span.min-w-0")?.textContent ?? h.textContent ?? "",
    )
    const expected = services.map((s) => s.title.ja)
    expect(renderedTitles).toEqual(expected)
  })
})
