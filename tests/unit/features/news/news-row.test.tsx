import { screen, within } from "@testing-library/react"
import { describe, expect, test } from "vitest"

import { NewsRow } from "~/features/news/news-row"
import type { NewsItem } from "~/lib/api"

import { renderWithStub } from "../../_helpers/render"

const buildItem = (overrides: Partial<NewsItem> = {}): NewsItem => ({
  id: "n-1",
  source: "ddbj",
  category: "data-release",
  featured: false,
  publishedAt: "2026-05-20T00:00:00+09:00",
  title: { ja: "公開のお知らせ", en: "Public release" },
  db: [],
  rawTags: { ja: [], en: [] },
  ...overrides,
})

const renderRow = (item: NewsItem, lang: "ja" | "en" = "ja") =>
  renderWithStub({
    routes: [
      {
        path: "/",
        Component: () => <ul><NewsRow item={item} lang={lang} /></ul>,
      },
    ],
    initialEntries: ["/"],
    lang,
  })

describe("NewsRow", () => {
  test("NewsRow_titleJa_isShownInJaLang", () => {
    renderRow(buildItem())
    expect(screen.getByText("公開のお知らせ")).toBeInTheDocument()
  })

  test("NewsRow_titleEn_isShownInEnLang", () => {
    renderRow(buildItem(), "en")
    expect(screen.getByText("Public release")).toBeInTheDocument()
  })

  test("NewsRow_publishedAt_isFormattedAsYmd", () => {
    renderRow(buildItem({ publishedAt: "2026-05-20T00:00:00+09:00" }))
    expect(screen.getByText("2026/05/20")).toBeInTheDocument()
  })

  test("NewsRow_withUrl_rendersExternalLink", () => {
    const item = buildItem({ url: { ja: "https://example.com/ja", en: "https://example.com/en" } })
    renderRow(item)
    const link = screen.getByRole("link", { name: /公開のお知らせ/ })
    expect(link).toHaveAttribute("href", "https://example.com/ja")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })

  test("NewsRow_withUrlEn_picksEnUrl", () => {
    const item = buildItem({ url: { ja: "https://example.com/ja", en: "https://example.com/en" } })
    renderRow(item, "en")
    const link = screen.getByRole("link", { name: /Public release/ })
    expect(link).toHaveAttribute("href", "https://example.com/en")
  })

  test("NewsRow_withoutUrl_doesNotRenderLink", () => {
    renderRow(buildItem())
    expect(screen.queryByRole("link", { name: /公開のお知らせ/ })).toBeNull()
  })

  test("NewsRow_withSummary_rendersSummaryParagraph", () => {
    const item = buildItem({
      summary: { ja: "公開予定の説明。", en: "Description." },
    })
    renderRow(item)
    expect(screen.getByText("公開予定の説明。")).toBeInTheDocument()
  })

  test("NewsRow_emptySummary_doesNotRenderSummary", () => {
    const { container } = renderRow(buildItem({
      summary: { ja: "", en: "" },
    }))
    expect(container.querySelector("p.text-fs-meta")).toBeNull()
  })

  test("NewsRow_summary_appliesLineClamp2", () => {
    const item = buildItem({
      summary: { ja: "短い説明", en: "Short summary" },
    })
    const { container } = renderRow(item)
    const p = container.querySelector("p.text-fs-meta")
    expect(p).toHaveClass("line-clamp-2")
  })

  test("NewsRow_sourceDdbj_rendersDdbjSourceTag", () => {
    const { container } = renderRow(buildItem({ source: "ddbj" }))
    expect(container.textContent ?? "").toContain("DDBJ")
  })

  test("NewsRow_sourceDbcls_rendersDbclsSourceTag", () => {
    const { container } = renderRow(buildItem({ source: "dbcls" }))
    expect(container.textContent ?? "").toContain("DBCLS")
  })

  test("NewsRow_dbTags_areRenderedForEachDb", () => {
    const item = buildItem({ db: ["bioproject", "sra"] })
    renderRow(item)
    expect(screen.getByText("bioproject")).toBeInTheDocument()
    expect(screen.getByText("sra")).toBeInTheDocument()
  })

  test("NewsRow_categoryTag_isRendered", () => {
    renderRow(buildItem({ category: "data-release" }))
    const list = screen.getByRole("listitem")
    const tagsContainer = list.querySelector(".flex.items-start.gap-1\\.5")
    expect(tagsContainer?.textContent ?? "").not.toBe("")
  })

  test("NewsRow_listItemBorder_isAppliedExceptLast", () => {
    const { container } = renderRow(buildItem())
    const li = container.querySelector("li")
    expect(li).toHaveClass("border-b", "border-border-soft", "last:border-b-0")
  })

  test("NewsRow_invalidDate_fallsBackToOriginalString", () => {
    const item = buildItem({ publishedAt: "not-a-date" })
    const { container } = renderRow(item)
    expect(container.textContent ?? "").toContain("not-a-date")
  })

  test("NewsRow_dateColumn_appliesMonoFontAndFixedWidth", () => {
    const { container } = renderRow(buildItem())
    const dateSpan = container.querySelector("span.font-mono")
    expect(dateSpan).toHaveClass("w-20", "text-fs-meta", "text-ink-soft", "tracking-mono")
  })

  test("NewsRow_enFallback_picksJaWhenEnIsEmpty", () => {
    const item = buildItem({ title: { ja: "日本語のみ", en: "" } })
    renderRow(item, "en")
    expect(screen.getByText("日本語のみ")).toBeInTheDocument()
  })

  test("NewsRow_summaryEnPicksFallback_whenEnEmpty", () => {
    const item = buildItem({
      summary: { ja: "日本語の概要", en: "" },
    })
    renderRow(item, "en")
    expect(screen.getByText("日本語の概要")).toBeInTheDocument()
  })

  test("NewsRow_renderedAsListItem", () => {
    renderRow(buildItem())
    const item = screen.getByRole("listitem")
    expect(within(item).getByText("公開のお知らせ")).toBeInTheDocument()
  })
})
