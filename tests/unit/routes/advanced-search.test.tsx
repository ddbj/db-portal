import { fireEvent, screen, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import AdvancedSearch from "@/routes/advanced-search"

import { renderWithProviders } from "../../helpers/providers"

describe("/advanced-search route", () => {
  it("空の /advanced-search でヒーローとビルダーが描画される", () => {
    renderWithProviders(<AdvancedSearch />, { route: "/advanced-search" })
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/詳細検索/)
    expect(screen.getByText(/条件が未設定です/)).toBeInTheDocument()
  })

  it("検索ボタンは条件が未設定なら disable", () => {
    renderWithProviders(<AdvancedSearch />, { route: "/advanced-search" })
    const btn = screen.getByRole("button", { name: "検索" })
    expect(btn).toBeDisabled()
  })

  it("?db=sra で single モード、sra が選択されている", () => {
    renderWithProviders(<AdvancedSearch />, {
      route: "/advanced-search?db=sra",
    })
    const singleRadio = screen.getByLabelText("単一 DB") as HTMLInputElement
    expect(singleRadio.checked).toBe(true)
    expect(screen.getByText(/SRA/)).toBeInTheDocument()
  })

  it("?adv=title:cancer で preview に title:cancer が表示される", () => {
    renderWithProviders(<AdvancedSearch />, {
      route: "/advanced-search?adv=title%3Acancer",
    })
    expect(screen.getByText("title:cancer")).toBeInTheDocument()
    expect(screen.getByText(/URL から受信した DSL/)).toBeInTheDocument()
  })

  it("Example クリックで条件が入り、検索ボタンが enable になる", async () => {
    renderWithProviders(<AdvancedSearch />, { route: "/advanced-search" })

    const searchBtn = screen.getByRole("button", { name: "検索" })
    expect(searchBtn).toBeDisabled()

    const firstChip = screen.getByText(
      "ヒトを対象にしたがん関連の横断検索",
    )
    fireEvent.click(firstChip)

    await waitFor(() => {
      expect(searchBtn).not.toBeDisabled()
    })
    expect(screen.getByText(/title:cancer/)).toBeInTheDocument()
  })

  it("RESET ボタンで tree が空に戻る", async () => {
    renderWithProviders(<AdvancedSearch />, { route: "/advanced-search" })
    fireEvent.click(screen.getByText("ヒトを対象にしたがん関連の横断検索"))
    await waitFor(() => {
      expect(screen.queryByText(/条件が未設定です/)).not.toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: "リセット" }))
    expect(screen.getByText(/条件が未設定です/)).toBeInTheDocument()
  })
})
