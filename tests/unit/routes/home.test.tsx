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

  it("does not render an h1 hero block (search box is the entry point)", () => {
    renderHome()
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument()
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

  it("renders 6 service cards (2 internal + 4 external) with expected hrefs", () => {
    renderHome()

    const adv = screen.getByRole("link", { name: /詳細検索/ })
    expect(adv).toHaveAttribute("href", "/advanced-search")

    const sub = screen.getByRole("link", { name: /登録ナビへ/ })
    expect(sub).toHaveAttribute("href", "/submit")

    const services = screen.getByRole("link", { name: /サービス一覧/ })
    expect(services).toHaveAttribute("href", "https://www.ddbj.nig.ac.jp/services/")
    expect(services).toHaveAttribute("target", "_blank")
    expect(services).toHaveAttribute("rel", "noopener noreferrer")

    const sc = screen.getByRole("link", { name: /スパコンの利用へ/ })
    expect(sc).toHaveAttribute("href", "https://sc.ddbj.nig.ac.jp/")
    expect(sc).toHaveAttribute("target", "_blank")

    const stats = screen.getByRole("link", { name: /統計を見る/ })
    expect(stats).toHaveAttribute("href", "https://www.ddbj.nig.ac.jp/statistics/")
    expect(stats).toHaveAttribute("target", "_blank")

    const activities = screen.getByRole("link", { name: /活動を見る/ })
    expect(activities).toHaveAttribute("href", "https://www.ddbj.nig.ac.jp/activities/")
    expect(activities).toHaveAttribute("target", "_blank")
  })

  it("renders お知らせ / News tabs with お知らせ selected by default and switches on click", () => {
    renderHome()

    const announcementTab = screen.getByRole("tab", { name: "お知らせ" })
    const newsTab = screen.getByRole("tab", { name: "News" })
    expect(announcementTab).toHaveAttribute("aria-selected", "true")
    expect(newsTab).toHaveAttribute("aria-selected", "false")

    fireEvent.click(newsTab)
    expect(announcementTab).toHaveAttribute("aria-selected", "false")
    expect(newsTab).toHaveAttribute("aria-selected", "true")
  })

  it("renders the もっと見る link pointing to /news", () => {
    renderHome()
    const more = screen.getByRole("link", { name: /もっと見る/ })
    expect(more).toHaveAttribute("href", "/news")
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
