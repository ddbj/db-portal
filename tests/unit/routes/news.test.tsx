import { fireEvent, screen } from "@testing-library/react"
import { MemoryRouter } from "react-router"
import { describe, expect, it } from "vitest"

import News from "@/routes/news"
import type { NewsQueryResult } from "@/server/news-mirror"

import { renderWithI18n } from "../../helpers/i18n"

const sampleResult = (): NewsQueryResult => ({
  hits: [
    {
      id: "ddbj-ja-2026-04-08",
      source: "ddbj",
      slug: "2026-04-08",
      lang: "ja",
      date: "2026-04-08",
      dateTime: "2026-04-08T00:00:00.000Z",
      retireTime: null,
      db: ["ddbj", "top"],
      tags: ["data-release"],
      title: "DDBJ リリース 141.0",
      bodyHtml: "",
      sourceUrl: "https://www.ddbj.nig.ac.jp/news/ja/2026-04-08.html",
      sourceMdUrl: "",
      type: "news",
      pairId: null,
    },
    {
      id: "ddbj-ja-2026-03-19",
      source: "ddbj",
      slug: "2026-03-19",
      lang: "ja",
      date: "2026-03-19",
      dateTime: "2026-03-19T00:00:00.000Z",
      retireTime: null,
      db: ["ddbj"],
      tags: ["announcement"],
      title: "INSDC min spec",
      bodyHtml: "",
      sourceUrl: "https://www.ddbj.nig.ac.jp/news/ja/2026-03-19.html",
      sourceMdUrl: "",
      type: "notification",
      pairId: null,
    },
    {
      id: "dbcls-ja-2025-09-01-post1",
      source: "dbcls",
      slug: "2025-09-01-post1",
      lang: "ja",
      date: "2025-09-01",
      dateTime: "2025-09-01T00:00:00.000Z",
      retireTime: null,
      db: [],
      tags: ["service"],
      title: "DBCLS のサービス更新",
      bodyHtml: "",
      sourceUrl: "https://dbcls.rois.ac.jp/ja/2025/09/01/post1.html",
      sourceMdUrl: "",
      type: "news",
      pairId: null,
    },
  ],
  total: 3,
  facets: {
    year: [
      { value: "2026", count: 2 },
      { value: "2025", count: 1 },
    ],
    source: [
      { value: "ddbj", count: 2 },
      { value: "dbcls", count: 1 },
    ],
    db: [
      { value: "ddbj", count: 2 },
      { value: "top", count: 1 },
    ],
    tag: [
      { value: "announcement", count: 1 },
      { value: "data-release", count: 1 },
      { value: "maintenance", count: 0 },
      { value: "service", count: 1 },
      { value: "event", count: 0 },
      { value: "recruitment", count: 0 },
      { value: "other", count: 0 },
    ],
    type: [
      { value: "notification", count: 1 },
      { value: "news", count: 2 },
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
    expect(screen.getByText("DBCLS のサービス更新")).toBeInTheDocument()
    expect(screen.getByText("2026/04/08")).toBeInTheDocument()
  })

  it("renders facet sections (Type / Source / Year / DB / Tag)", () => {
    renderNews()
    expect(screen.getByRole("heading", { name: "種別" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "ソース" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "年" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "サービス" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { name: "タグ" })).toBeInTheDocument()
  })

  it("renders source checkboxes for DDBJ and DBCLS", () => {
    renderNews()
    expect(screen.getByLabelText("DDBJ")).toBeInTheDocument()
    expect(screen.getByLabelText("DBCLS")).toBeInTheDocument()
  })

  it("renders canonical tag labels in Japanese", () => {
    renderNews()
    expect(screen.getByLabelText("お知らせ")).toBeInTheDocument()
    expect(screen.getByLabelText("データ公開")).toBeInTheDocument()
    expect(screen.getByLabelText("サービス")).toBeInTheDocument()
  })

  it("renders the year facet bucket with its count", () => {
    renderNews()
    const yearButton = screen.getByRole("button", { name: /^2026/ })
    expect(yearButton).toBeInTheDocument()
  })

  it("renders the count line", () => {
    renderNews()
    expect(screen.getByText(/3.*件/)).toBeInTheDocument()
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

  it("shows clearAll when source facet is preselected via URL", () => {
    renderNews("/news?source=dbcls")
    expect(screen.getByText("すべてクリア")).toBeInTheDocument()
  })

  it("clicking on a year toggles selection (clearAll appears)", () => {
    renderNews()
    const yearBtn = screen.getByRole("button", { name: /^2026/ })
    fireEvent.click(yearBtn)
    expect(screen.getByText("すべてクリア")).toBeInTheDocument()
  })
})
