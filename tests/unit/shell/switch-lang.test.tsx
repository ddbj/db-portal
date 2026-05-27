import { screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { SwitchLang } from "~/shell/switch-lang"

import { renderWithStub } from "../_helpers/render"

const enHandle = { lang: "en" as const }

const renderAt = (path: string) => {
  const isEn = path === "/en" || path.startsWith("/en/")

  return renderWithStub({
    routes: [
      { path: "/", Component: () => <SwitchLang /> },
      { path: "/search", Component: () => <SwitchLang /> },
      { path: "/en", handle: enHandle, Component: () => <SwitchLang /> },
      { path: "/en/news", handle: enHandle, Component: () => <SwitchLang /> },
    ],
    initialEntries: [path],
    lang: isEn ? "en" : "ja",
    withQuery: false,
  })
}

describe("SwitchLang", () => {
  test("SwitchLang_jaPath_linksToEnCounterpart", () => {
    renderAt("/search")
    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/en/search")
  })

  test("SwitchLang_jaRoot_linksToEnRoot", () => {
    renderAt("/")
    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/en")
  })

  test("SwitchLang_enPath_linksToJaCounterpart", () => {
    renderAt("/en/news")
    const link = screen.getByRole("link")
    expect(link).toHaveAttribute("href", "/news")
  })

  test("SwitchLang_linkHasAriaLabelForLanguageSwitcher", () => {
    renderAt("/search")
    const link = screen.getByRole("link", { name: "言語切替" })
    expect(link).toHaveAttribute("hrefLang", "en")
    expect(link).toHaveAttribute("lang", "en")
  })

  test("SwitchLang_enPath_hrefLangPointsToJa", () => {
    renderAt("/en/news")
    const link = screen.getByRole("link", { name: "Language switcher" })
    expect(link).toHaveAttribute("hrefLang", "ja")
    expect(link).toHaveAttribute("lang", "ja")
  })

  test("SwitchLang_jaActive_jaPillIsBoldEnPillIsNotBold", () => {
    renderAt("/search")
    const jaPill = screen.getByText("JA")
    const enPill = screen.getByText("EN")
    expect(jaPill).toHaveClass("font-bold", "text-ink")
    expect(enPill).toHaveClass("font-normal", "text-ink-mid")
    expect(jaPill).not.toHaveClass("font-normal")
    expect(enPill).not.toHaveClass("font-bold")
  })

  test("SwitchLang_enActive_enPillIsBoldJaPillIsNotBold", () => {
    renderAt("/en/news")
    const jaPill = screen.getByText("JA")
    const enPill = screen.getByText("EN")
    expect(enPill).toHaveClass("font-bold", "text-ink")
    expect(jaPill).toHaveClass("font-normal", "text-ink-mid")
  })
})
