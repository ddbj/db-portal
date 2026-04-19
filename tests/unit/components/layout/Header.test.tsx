import { render, screen, within } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"

import Header from "@/components/layout/Header"
import { NAV_ITEMS } from "@/lib/nav"

const renderHeader = (initialPath = "/") => render(
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

  it("renders nav with all NAV_ITEMS labels and hrefs", () => {
    renderHeader()
    const nav = screen.getByRole("navigation", { name: "メインナビゲーション" })

    for (const item of NAV_ITEMS) {
      const link = within(nav).getByRole("link", { name: item.label })
      expect(link).toHaveAttribute("href", item.to)
    }
  })

  it("does not include 'デザインシステム' in the nav", () => {
    renderHeader()
    const nav = screen.getByRole("navigation", { name: "メインナビゲーション" })
    expect(within(nav).queryByRole("link", { name: "デザインシステム" })).toBeNull()
  })

  it("login button is <button type='button'> (prevents form submit)", () => {
    renderHeader()
    const button = screen.getByRole("button", { name: "ログイン（未実装）" })
    expect(button).toHaveAttribute("type", "button")
  })

  it("language switch button shows 'JA / EN' with JA as current locale", () => {
    renderHeader()
    const langButton = screen.getByRole("button", { name: "言語切替（未実装）" })
    expect(langButton).toHaveTextContent(/JA/)
    expect(langButton).toHaveTextContent(/EN/)
    expect(langButton).toHaveAttribute("type", "button")
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
