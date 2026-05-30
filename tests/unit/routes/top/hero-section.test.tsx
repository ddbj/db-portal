import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { HeroSection } from "~/routes/top/hero-section"

import { renderWithStub } from "../../_helpers/render"

const renderHero = (lang: "ja" | "en" = "ja") =>
  renderWithStub({
    routes: [
      { path: "/", Component: () => <HeroSection /> },
      { path: "/search", Component: () => <span>search</span> },
    ],
    initialEntries: ["/"],
    lang,
  })

describe("HeroSection", () => {
  test("HeroSection_searchBox_isRenderedWithPlaceholder", () => {
    renderHero()
    const input = screen.getByRole("textbox")
    expect(input).toHaveAttribute("placeholder", "キーワード、accession、学名で検索")
  })

  test("HeroSection_searchBox_showsSearchIconInKeywordMode", () => {
    const { container } = renderHero()
    const inputRow = container.querySelector(".flex-1.flex.items-center")
    expect(inputRow?.querySelector("svg")).not.toBeNull()
  })

  test("HeroSection_exampleChips_areRenderedAsButtons", () => {
    renderHero()
    const exampleChips = screen.getAllByRole("button").filter((el) =>
      el.className.includes("rounded-pill"),
    )
    expect(exampleChips.length).toBeGreaterThan(0)
  })

  test("HeroSection_exampleChipClick_populatesInput", () => {
    renderHero()
    const exampleChips = screen.getAllByRole("button").filter((el) =>
      el.className.includes("rounded-pill"),
    )
    const chip = exampleChips[0]!
    const label = chip.textContent ?? ""
    fireEvent.click(chip)
    expect(screen.getByRole("textbox")).toHaveValue(label)
  })

  test("HeroSection_advancedLink_pointsToSearch", () => {
    renderHero()
    const link = screen.getByRole("link", { name: /→/ })
    expect(link).toHaveAttribute("href", "/search")
  })

  test("HeroSection_scopeDropdown_opensListbox", () => {
    renderHero()
    const scope = screen.getByRole("button", { name: /検索対象/ })
    expect(scope).toHaveAttribute("aria-expanded", "false")
    fireEvent.click(scope)
    expect(scope).toHaveAttribute("aria-expanded", "true")
    expect(screen.getByRole("listbox")).toBeInTheDocument()
  })

  test("HeroSection_scopeSelectOption_updatesDisplayedScope", () => {
    renderHero()
    const scope = screen.getByRole("button", { name: /検索対象/ })
    fireEvent.click(scope)
    const bp = screen.getByRole("option", { name: /BioProject/ })
    fireEvent.click(bp)
    expect(screen.getByRole("button", { name: /検索対象/ })).toHaveTextContent("BioProject")
  })
})
