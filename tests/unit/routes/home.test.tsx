import { fireEvent, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"

import Home from "@/routes/home"

import { renderWithI18n } from "../../helpers/i18n"

const mockNavigate = vi.fn()

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const renderHome = () =>
  renderWithI18n(
    <MemoryRouter initialEntries={["/"]}>
      <Home />
    </MemoryRouter>,
  )

describe("Home (/)", () => {

  beforeEach(() => {
    mockNavigate.mockClear()
  })

  it("renders the hero heading and subtitle", () => {
    renderHome()
    const h1 = screen.getByRole("heading", { level: 1 })
    expect(h1).toHaveTextContent("DB ポータル (仮)")
    expect(screen.getByText(/主要データベース/)).toBeInTheDocument()
  })

  it("renders DB selector, search input, search button and 4 example chips", () => {
    renderHome()
    expect(screen.getByRole("button", { name: "検索対象 DB" })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/キーワード/)).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "検索" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Homo sapiens" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Escherichia coli" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "PRJDB10000" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "DRR000001" })).toBeInTheDocument()
  })

  it("renders two CTA LinkCards pointing to /advanced-search and /submit", () => {
    renderHome()
    const advLink = screen.getByRole("link", { name: /詳細検索/ })
    expect(advLink).toHaveAttribute("href", "/advanced-search")
    const subLink = screen.getByRole("link", { name: /登録ナビへ/ })
    expect(subLink).toHaveAttribute("href", "/submit")
  })

  it("navigates to /search?q=<q> when submitting with db=all", () => {
    renderHome()
    const input = screen.getByPlaceholderText(/キーワード/)
    fireEvent.change(input, { target: { value: "SARS-CoV-2" } })
    fireEvent.submit(input.closest("form")!)
    expect(mockNavigate).toHaveBeenCalledTimes(1)
    expect(mockNavigate).toHaveBeenCalledWith("/search?q=SARS-CoV-2")
  })

  it("navigates to /search?q=<q>&db=<id> when a specific DB is selected", () => {
    renderHome()
    fireEvent.click(screen.getByRole("button", { name: "検索対象 DB" }))
    fireEvent.click(screen.getByRole("option", { name: "SRA" }))
    const input = screen.getByPlaceholderText(/キーワード/)
    fireEvent.change(input, { target: { value: "Homo sapiens" } })
    fireEvent.submit(input.closest("form")!)
    expect(mockNavigate).toHaveBeenCalledWith("/search?q=Homo+sapiens&db=sra")
  })

  it("clicking an example chip navigates with that chip's query (db=all by default)", () => {
    renderHome()
    fireEvent.click(screen.getByRole("button", { name: "Escherichia coli" }))
    expect(mockNavigate).toHaveBeenCalledWith("/search?q=Escherichia+coli")
  })

  it("DB selector includes an 'all' option plus the 8 DDBJ databases (9 total)", () => {
    renderHome()
    fireEvent.click(screen.getByRole("button", { name: "検索対象 DB" }))
    const options = screen.getAllByRole("option")
    expect(options).toHaveLength(9)
    expect(options[0]).toHaveTextContent("すべての DB")
  })
})
