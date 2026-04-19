import { screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"

import Header from "@/components/layout/Header"
import { NAV_ITEMS, type NavItem } from "@/lib/nav"

import { renderWithI18n } from "../../../helpers/i18n"

const NAV_LABELS_JA = {
  "header.nav.search": "検索",
  "header.nav.advancedSearch": "詳細検索",
  "header.nav.submit": "登録",
} as const satisfies Record<NavItem["labelKey"], string>

const renderHeader = (initialPath = "/") =>
  renderWithI18n(
    <MemoryRouter initialEntries={[initialPath]}>
      <Header />
    </MemoryRouter>,
  )

describe("Header", () => {

  it("logo link shows 'DDBJ Portal' and points to /", () => {
    renderHeader()
    const logo = screen.getByRole("link", { name: "DDBJ Portal" })
    expect(logo).toHaveAttribute("href", "/")
  })

  it("renders nav with all NAV_ITEMS labels (ja) and hrefs", () => {
    renderHeader()
    const nav = screen.getByRole("navigation", { name: "メインナビゲーション" })

    for (const item of NAV_ITEMS) {
      const expectedLabel = NAV_LABELS_JA[item.labelKey]
      const link = within(nav).getByRole("link", { name: expectedLabel })
      expect(link).toHaveAttribute("href", item.to)
    }
  })

  it("does not include 'デザインシステム' in the nav", () => {
    renderHeader()
    const nav = screen.getByRole("navigation", { name: "メインナビゲーション" })
    expect(within(nav).queryByRole("link", { name: "デザインシステム" })).toBeNull()
  })

  it("login button shows 'ログイン' label and is type='button'", () => {
    renderHeader()
    const button = screen.getByRole("button", { name: "ログイン" })
    expect(button).toHaveAttribute("type", "button")
  })

  it("language toggle exposes JA and EN buttons with JA aria-pressed initially", () => {
    renderHeader()
    const group = screen.getByRole("group", { name: "言語切替" })
    const jaBtn = within(group).getByRole("button", { name: "JA" })
    const enBtn = within(group).getByRole("button", { name: "EN" })
    expect(jaBtn).toHaveAttribute("type", "button")
    expect(enBtn).toHaveAttribute("type", "button")
    expect(jaBtn).toHaveAttribute("aria-pressed", "true")
    expect(enBtn).toHaveAttribute("aria-pressed", "false")
  })

  it("marks current route as active via NavLink isActive (aria-current='page')", () => {
    renderHeader("/search")
    const nav = screen.getByRole("navigation", { name: "メインナビゲーション" })
    const active = within(nav).getByRole("link", { name: "検索" })
    expect(active).toHaveAttribute("aria-current", "page")

    const inactive = within(nav).getByRole("link", { name: "登録" })
    expect(inactive).not.toHaveAttribute("aria-current", "page")
  })
})
