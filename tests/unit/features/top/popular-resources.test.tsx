import { screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { PopularResources } from "~/features/top/popular-resources"
import { listServicesByTopCategory } from "~/lib/content"

import { renderWithStub } from "../../_helpers/render"

const renderPanel = (lang: "ja" | "en" = "ja") =>
  renderWithStub({
    routes: [
      { path: "/", Component: () => <PopularResources lang={lang} /> },
      { path: "*", Component: () => <span>stub</span> },
    ],
    initialEntries: ["/"],
    lang,
  })

describe("PopularResources", () => {
  test("PopularResources_rendersBothGroupLabels", () => {
    const { container } = renderPanel()
    const ddbjLabel = container.querySelector(".text-src-ddbj")
    const dbclsLabel = container.querySelector(".text-src-dbcls")
    expect(ddbjLabel).toHaveTextContent("DDBJ")
    expect(dbclsLabel).toHaveTextContent("DBCLS")
  })

  test("PopularResources_ddbjAndDbclsCounts_matchContentCollection", () => {
    const ddbj = listServicesByTopCategory("popular-ddbj")
    const dbcls = listServicesByTopCategory("popular-dbcls")
    expect(ddbj.length).toBeGreaterThan(0)
    expect(dbcls.length).toBeGreaterThan(0)
    const { container } = renderPanel()
    const cards = container.querySelectorAll("ul > li")
    expect(cards.length).toBe(ddbj.length + dbcls.length)
  })

  test("PopularResources_ddbjGroup_appliesDdbjPalette", () => {
    const { container } = renderPanel()
    const swatches = container.querySelectorAll(".bg-src-ddbj")
    expect(swatches.length).toBeGreaterThan(0)
    const ddbjLabel = container.querySelector(".text-src-ddbj")
    expect(ddbjLabel).not.toBeNull()
  })

  test("PopularResources_dbclsGroup_appliesDbclsPalette", () => {
    const { container } = renderPanel()
    const dbclsLabel = container.querySelector(".text-src-dbcls")
    expect(dbclsLabel).not.toBeNull()
  })

  test("PopularResources_enLang_rendersEnglishTitles", () => {
    const ddbj = listServicesByTopCategory("popular-ddbj")
    renderPanel("en")
    for (const service of ddbj.slice(0, 1)) {
      expect(screen.getByText(service.title.en)).toBeInTheDocument()
    }
  })

  test("PopularResources_accentColors_areAllFromDdbjOrDbclsPalette", () => {
    const { container } = renderPanel()
    const monogramBoxes = container.querySelectorAll(".w-9.h-9")
    expect(monogramBoxes.length).toBeGreaterThan(0)
    const allowedAccents = [
      "src-ddbj-warm",
      "src-ddbj-mid",
      "src-ddbj-deep",
      "src-dbcls-warm",
      "src-dbcls-mid",
    ]
    for (const box of monogramBoxes) {
      const classes = (box.getAttribute("class") ?? "").split(/\s+/)
      const hasAccent = allowedAccents.some((accent) =>
        classes.some((c) => c.includes(accent)),
      )
      expect(hasAccent).toBe(true)
    }
  })

  test("PopularResources_ddbjGroupFirst_then_dbclsGroup", () => {
    const ddbj = listServicesByTopCategory("popular-ddbj")
    const { container } = renderPanel()
    const groupLabels = container.querySelectorAll(".tracking-eyebrow")
    expect(groupLabels.length).toBe(2)
    const firstLabelClass = groupLabels[0]?.className ?? ""
    expect(firstLabelClass).toContain("text-src-ddbj")
    expect(firstLabelClass).not.toContain("text-src-dbcls")
    const ddbjCardCount = ddbj.length
    const allMonograms = container.querySelectorAll(".w-9.h-9")
    const firstNAccent = (allMonograms[0]?.getAttribute("class") ?? "")
    expect(firstNAccent).toContain("src-ddbj")
    const afterDdbjAccent = (allMonograms[ddbjCardCount]?.getAttribute("class") ?? "")
    expect(afterDdbjAccent).toContain("src-dbcls")
  })
})
