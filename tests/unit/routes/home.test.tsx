import { fireEvent, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { beforeEach, describe, expect, it, vi } from "vitest"

import Home from "@/routes/home"
import type { MirroredNewsItem } from "@/server/news-mirror"

import { renderWithI18n } from "../../helpers/i18n"

const mockNavigate = vi.fn()

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal() as Record<string, unknown>

  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

const sampleNews: MirroredNewsItem[] = [
  {
    id: "ddbj-ja-2026-04-08",
    source: "ddbj",
    slug: "2026-04-08",
    lang: "ja",
    date: "2026-04-08",
    dateTime: "2026-04-08T00:00:00.000Z",
    retireTime: null,
    db: ["ddbj"],
    tags: ["data-release"],
    title: "DDBJ リリース 141.0",
    bodyHtml: "",
    sourceUrl: "https://www.ddbj.nig.ac.jp/news/ja/2026-04-08.html",
    sourceMdUrl: "",
    type: "news",
    pairId: null,
  },
]

const fakeLoaderData = {
  lang: "ja" as const,
  metaTitle: "DDBJ 刷新 (仮)",
  metaDescription: "desc",
  news: sampleNews,
}

type HomeProps = Parameters<typeof Home>[0]

const renderHome = () =>
  renderWithI18n(
    <MemoryRouter initialEntries={["/"]}>
      <Home
        loaderData={fakeLoaderData}
        params={{}}
        matches={[] as unknown as HomeProps["matches"]}
      />
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

  it("renders the news aside with items from loader data", () => {
    renderHome()
    expect(screen.getByText("DDBJ リリース 141.0")).toBeInTheDocument()
    expect(screen.getByText("2026/04/08")).toBeInTheDocument()
  })

  it("renders the もっと見る link pointing to /news", () => {
    renderHome()
    const more = screen.getByRole("link", { name: /もっと見る/ })
    expect(more).toHaveAttribute("href", "/news")
  })

  it("quotes the raw input as a FreeText DSL phrase when submitting with db=all", () => {
    renderHome()
    const input = screen.getByPlaceholderText(/キーワード/)
    fireEvent.change(input, { target: { value: "SARS-CoV-2" } })
    fireEvent.submit(input.closest("form")!)
    expect(mockNavigate).toHaveBeenCalledTimes(1)
    expect(mockNavigate).toHaveBeenCalledWith("/search?q=%22SARS-CoV-2%22")
  })

  it("quotes space-separated input into a single phrase when a specific DB is selected", () => {
    renderHome()
    fireEvent.click(screen.getByRole("button", { name: "検索対象 DB" }))
    fireEvent.click(screen.getByRole("option", { name: "SRA" }))
    const input = screen.getByPlaceholderText(/キーワード/)
    fireEvent.change(input, { target: { value: "Homo sapiens" } })
    fireEvent.submit(input.closest("form")!)
    expect(mockNavigate).toHaveBeenCalledWith("/search?q=%22Homo+sapiens%22&db=sra")
  })

  it("clicking an example chip navigates with that chip's query quoted as a phrase", () => {
    renderHome()
    fireEvent.click(screen.getByRole("button", { name: "Escherichia coli" }))
    expect(mockNavigate).toHaveBeenCalledWith("/search?q=%22Escherichia+coli%22")
  })

  it("does not navigate when the input is whitespace only (no DSL emitted)", () => {
    renderHome()
    const input = screen.getByPlaceholderText(/キーワード/)
    fireEvent.change(input, { target: { value: "   " } })
    fireEvent.submit(input.closest("form")!)
    expect(mockNavigate).toHaveBeenCalledWith("/search")
  })

  it("escapes embedded double quotes when wrapping input as a phrase", () => {
    renderHome()
    const input = screen.getByPlaceholderText(/キーワード/)
    fireEvent.change(input, { target: { value: 'foo "bar" baz' } })
    fireEvent.submit(input.closest("form")!)
    const url = mockNavigate.mock.calls[0]?.[0] as string
    const params = new URLSearchParams(url.split("?")[1])
    expect(params.get("q")).toBe('"foo \\"bar\\" baz"')
  })

  it("DB selector includes an 'all' option plus the 8 DDBJ databases (9 total)", () => {
    renderHome()
    fireEvent.click(screen.getByRole("button", { name: "検索対象 DB" }))
    const options = screen.getAllByRole("option")
    expect(options).toHaveLength(9)
    expect(options[0]).toHaveTextContent("すべての DB")
  })

  describe("Popular Resources section", () => {
    it("renders the heading and both DDBJ / DBCLS group labels", () => {
      renderHome()
      expect(
        screen.getByRole("heading", { name: "Popular Resources" }),
      ).toBeInTheDocument()
      expect(screen.getByRole("heading", { name: "DDBJ" })).toBeInTheDocument()
      expect(screen.getByRole("heading", { name: "DBCLS" })).toBeInTheDocument()
    })

    it("links each DDBJ resource to its ddbj.nig.ac.jp page with target=_blank", () => {
      renderHome()
      const cases: readonly [string, string][] = [
        ["BioProject", "https://www.ddbj.nig.ac.jp/bioproject/index.html"],
        ["BioSample", "https://www.ddbj.nig.ac.jp/biosample/index.html"],
        ["DRA", "https://www.ddbj.nig.ac.jp/dra/index.html"],
        ["DDBJ Annotated", "https://www.ddbj.nig.ac.jp/ddbj/index.html"],
        ["GEA", "https://www.ddbj.nig.ac.jp/gea/index.html"],
        ["JGA", "https://www.ddbj.nig.ac.jp/jga/index.html"],
        ["MetaboBank", "https://www.ddbj.nig.ac.jp/metabobank/index.html"],
      ]
      for (const [name, href] of cases) {
        const link = screen.getByRole("link", { name })
        expect(link).toHaveAttribute("href", href)
        expect(link).toHaveAttribute("target", "_blank")
        expect(link).toHaveAttribute("rel", "noopener noreferrer")
      }
    })

    it("links each DBCLS resource to its public URL with target=_blank", () => {
      renderHome()
      const cases: readonly [string, string][] = [
        ["TogoVar", "https://togovar.org/"],
        ["TogoGenome", "https://togogenome.org/"],
        ["GGGenome", "https://gggenome.dbcls.jp/"],
        ["RefEx", "https://refex.dbcls.jp/"],
        ["統合TV", "https://togotv.dbcls.jp/"],
      ]
      for (const [name, href] of cases) {
        const link = screen.getByRole("link", { name })
        expect(link).toHaveAttribute("href", href)
        expect(link).toHaveAttribute("target", "_blank")
      }
    })
  })
})
