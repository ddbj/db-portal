import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import Search from "@/routes/search"

import { renderWithProviders } from "../../helpers/providers"

const primarySearchButton = (): HTMLElement => {
  const buttons = screen.getAllByRole("button", { name: "検索" })
  const primary = buttons.find((b) => !b.hasAttribute("aria-haspopup")
    && b.getAttribute("type") !== "button" ? false : !b.closest("form"))

  return primary ?? buttons[buttons.length - 1]!
}

describe("/search route", () => {
  it("空の /search でヒーロー (検索) と SearchBox / 検索条件の empty state が描画される", () => {
    renderWithProviders(<Search />, { route: "/search" })
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/検索/)
    expect(screen.getByPlaceholderText(/キーワード/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "検索対象 DB" })).toBeInTheDocument()
    expect(screen.getByText(/条件が未設定です/)).toBeInTheDocument()
  })

  it("画面下の primary 検索ボタンは条件が未設定なら disable", () => {
    renderWithProviders(<Search />, { route: "/search" })
    const primary = primarySearchButton()
    expect(primary).toBeDisabled()
  })

  it("?db=sra で SearchBox の DB セレクタが SRA を選択している", () => {
    renderWithProviders(<Search />, { route: "/search?db=sra" })
    const dbButton = screen.getByRole("button", { name: "検索対象 DB" })
    expect(dbButton).toHaveTextContent(/SRA/)
  })

  it("?q=title:cancer 着地で QueryPreview に title:cancer が表示される", async () => {
    renderWithProviders(<Search />, { route: "/search?q=title%3Acancer" })
    await waitFor(() => {
      expect(screen.getByText(/title:cancer/)).toBeInTheDocument()
    })
  })

  it("SearchBox に入力するだけで Query Preview にフリーワード DSL が反映される", async () => {
    renderWithProviders(<Search />, { route: "/search" })
    const input = screen.getByPlaceholderText(/キーワード/)
    fireEvent.change(input, { target: { value: "cancer" } })
    await waitFor(() => {
      expect(screen.getByText(/"cancer"/)).toBeInTheDocument()
    })
  })

  it("SearchBox の入力を空に戻すと Query Preview からフリーワードが消える", async () => {
    renderWithProviders(<Search />, { route: "/search" })
    const input = screen.getByPlaceholderText(/キーワード/)
    fireEvent.change(input, { target: { value: "cancer" } })
    await waitFor(() => {
      expect(screen.getByText(/"cancer"/)).toBeInTheDocument()
    })
    fireEvent.change(input, { target: { value: "" } })
    await waitFor(() => {
      expect(screen.queryByText(/"cancer"/)).not.toBeInTheDocument()
    })
  })

  it("Example クリックで条件が入り、画面下の検索ボタンが enable になる", async () => {
    renderWithProviders(<Search />, { route: "/search" })

    const primary = primarySearchButton()
    expect(primary).toBeDisabled()

    fireEvent.click(screen.getByText("ヒトを対象にしたがん関連の横断検索"))

    await waitFor(() => {
      expect(primarySearchButton()).not.toBeDisabled()
    })
    expect(screen.getByText(/title:cancer/)).toBeInTheDocument()
  })

  it("RESET ボタンで tree が空に戻る", async () => {
    renderWithProviders(<Search />, { route: "/search" })
    fireEvent.click(screen.getByText("ヒトを対象にしたがん関連の横断検索"))
    await waitFor(() => {
      expect(screen.queryByText(/条件が未設定です/)).not.toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole("button", { name: "リセット" }))
    expect(screen.getByText(/条件が未設定です/)).toBeInTheDocument()
  })

  it("Query Builder からは「+ フリーワード」ボタンが消えている", () => {
    renderWithProviders(<Search />, { route: "/search" })
    expect(
      screen.queryByRole("button", { name: /フリーワード/ }),
    ).not.toBeInTheDocument()
  })

  it("画面中央の独立した DbSelector (radio) が撤去されている", () => {
    renderWithProviders(<Search />, { route: "/search" })
    // 旧 DbSelector の radio オプション「単一 DB」が消えていることで撤去を検知
    expect(screen.queryByLabelText("単一 DB")).not.toBeInTheDocument()
    expect(within(document.body).queryByRole("radio", { name: /単一 DB/ })).toBeNull()
  })
})
