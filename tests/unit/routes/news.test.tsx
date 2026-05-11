import { fireEvent, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"

import News from "@/routes/news"
import type { NewsQueryResult } from "@/server/news-mirror"

import { renderWithI18n } from "../../helpers/i18n"

const sampleResult = (): NewsQueryResult => ({
  hits: [
    {
      id: "ja-2026-04-08",
      slug: "2026-04-08",
      lang: "ja",
      date: "2026-04-08",
      dateTime: "2026-04-08T00:00:00.000Z",
      retireTime: null,
      db: ["ddbj", "top"],
      tags: ["データ公開"],
      title: "DDBJ リリース 141.0",
      bodyHtml: "",
      sourceUrl: "https://www.ddbj.nig.ac.jp/news/ja/2026-04-08.html",
      sourceMdUrl: "",
      type: "news",
      pairId: null,
    },
    {
      id: "ja-2026-03-19",
      slug: "2026-03-19",
      lang: "ja",
      date: "2026-03-19",
      dateTime: "2026-03-19T00:00:00.000Z",
      retireTime: null,
      db: ["ddbj"],
      tags: ["Announcement"],
      title: "INSDC min spec",
      bodyHtml: "",
      sourceUrl: "https://www.ddbj.nig.ac.jp/news/ja/2026-03-19.html",
      sourceMdUrl: "",
      type: "notification",
      pairId: null,
    },
  ],
  total: 2,
  facets: {
    year: [
      { value: "2026", count: 2 },
    ],
    db: [
      { value: "ddbj", count: 2 },
      { value: "top", count: 1 },
    ],
    tag: [
      { value: "データ公開", count: 1 },
      { value: "Announcement", count: 1 },
    ],
    type: [
      { value: "notification", count: 1 },
      { value: "news", count: 1 },
    ],
  },
  builtAt: "2026-05-11T00:00:00.000Z",
  nextCursor: null,
})

type NewsProps = Parameters<typeof News>[0]

const renderNews = (initialPath = "/news") =>
  renderWithI18n(
    <MemoryRouter initialEntries={[initialPath]}>
      <News
        loaderData={{
          initial: sampleResult(),
          lang: "ja",
          metaTitle: "News",
          metaDescription: "",
        }}
        params={{}}
        matches={[] as unknown as NewsProps["matches"]}
      />
    </MemoryRouter>,
  )

describe("/news", () => {
  it("renders the page heading", () => {
    renderNews()
    expect(screen.getByRole("heading", { level: 1, name: "お知らせ・ニュース" })).toBeInTheDocument()
  })

  it("renders hits with title and date", () => {
    renderNews()
    expect(screen.getByText("DDBJ リリース 141.0")).toBeInTheDocument()
    expect(screen.getByText("INSDC min spec")).toBeInTheDocument()
    expect(screen.getByText("2026/04/08")).toBeInTheDocument()
  })

  it("renders facet sections (Type / Year / DB / Tag)", () => {
    renderNews()
    expect(screen.getByRole("heading", { name: "種別" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "年" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "サービス" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "タグ" })).toBeInTheDocument()
  })

  it("renders the year facet bucket with its count", () => {
    renderNews()
    const yearButton = screen.getByRole("button", { name: /^2026/ })
    expect(yearButton).toBeInTheDocument()
  })

  it("renders the count line", () => {
    renderNews()
    expect(screen.getByText(/2.*件/)).toBeInTheDocument()
  })

  it("renders DB checkboxes", () => {
    renderNews()
    expect(screen.getByLabelText("ddbj")).toBeInTheDocument()
    expect(screen.getByLabelText("top")).toBeInTheDocument()
  })

  it("clicking a hit title navigates to external source URL", () => {
    renderNews()
    const link = screen.getByRole("link", { name: /DDBJ リリース 141.0/ })
    expect(link).toHaveAttribute("href", "https://www.ddbj.nig.ac.jp/news/ja/2026-04-08.html")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  it("does not show clearAll when nothing is selected", () => {
    renderNews()
    expect(screen.queryByText("すべてクリア")).not.toBeInTheDocument()
  })

  it("shows clearAll when a facet is preselected via URL", () => {
    renderNews("/news?year=2026")
    expect(screen.getByText("すべてクリア")).toBeInTheDocument()
  })

  it("clicking on a year toggles ?year= in URL via setSearchParams", () => {
    renderNews()
    const yearBtn = screen.getByRole("button", { name: /^2026/ })
    fireEvent.click(yearBtn)
    // After clicking, the button reflects selected state via tailwind class change; URL is internal to MemoryRouter
    // so we assert visually by checking that "クリア" link now appears
    expect(screen.getByText("すべてクリア")).toBeInTheDocument()
  })
})
