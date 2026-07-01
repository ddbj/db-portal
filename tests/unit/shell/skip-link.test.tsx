import { screen } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { SkipLink } from "~/shell/skip-link"

import { renderWithStub } from "../_helpers/render"

const renderLink = (lang: "ja" | "en" = "ja") =>
  renderWithStub({
    routes: [{ path: "/", Component: () => <SkipLink /> }],
    initialEntries: ["/"],
    lang,
  })

describe("SkipLink", () => {
  test("SkipLink_hrefPointsToMainAnchor", () => {
    renderLink()
    expect(screen.getByRole("link")).toHaveAttribute("href", "#main")
  })

  test("SkipLink_ja_labelIsTranslated", () => {
    renderLink("ja")
    expect(screen.getByRole("link")).toHaveTextContent("メインコンテンツへスキップ")
  })

  test("SkipLink_en_labelIsTranslated", () => {
    renderLink("en")
    expect(screen.getByRole("link")).toHaveTextContent(/skip/i)
  })

  test("SkipLink_isVisuallyHiddenUntilFocused", () => {
    renderLink()
    const link = screen.getByRole("link")
    expect(link).toHaveClass("sr-only")
    expect(link).toHaveClass("focus:not-sr-only")
    expect(link).toHaveClass("focus:absolute")
    expect(link).toHaveClass("focus:z-modal")
  })

  test("SkipLink_focusedStyle_appliesSurfaceAndBorder", () => {
    renderLink()
    const link = screen.getByRole("link")
    expect(link).toHaveClass("focus:bg-surface", "focus:border", "focus:border-border-soft")
  })

  test("SkipLink_focusable_canReceiveFocus", () => {
    renderLink()
    const link = screen.getByRole("link")
    link.focus()
    expect(document.activeElement).toBe(link)
  })
})
