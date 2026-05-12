import { fireEvent, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import NotificationBar from "@/components/layout/NotificationBar"
import type { MirroredNewsItem } from "@/server/news-mirror"

import { renderWithI18n } from "../../../helpers/i18n"

const item = (overrides: Partial<MirroredNewsItem> & { id: string; title: string }): MirroredNewsItem => ({
  source: "ddbj",
  slug: overrides.id,
  lang: "ja",
  date: "2026-04-08",
  dateTime: "2026-04-08T00:00:00.000Z",
  retireTime: null,
  db: [],
  tags: ["announcement"],
  bodyHtml: "",
  sourceUrl: "https://www.ddbj.nig.ac.jp/news/ja/sample.html",
  sourceMdUrl: "",
  type: "notification",
  pairId: null,
  ...overrides,
})

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  window.localStorage.clear()
})

describe("NotificationBar", () => {
  it("renders notification titles and date badges", () => {
    renderWithI18n(<NotificationBar notifications={[item({ id: "a", title: "重要なお知らせ A" })]} />)
    expect(screen.getByText("重要なお知らせ A")).toBeInTheDocument()
    expect(screen.getByText("2026/04/08")).toBeInTheDocument()
  })

  it("stacks multiple notifications", () => {
    renderWithI18n(<NotificationBar notifications={[
      item({ id: "a", title: "A" }),
      item({ id: "b", title: "B" }),
      item({ id: "c", title: "C" }),
    ]} />)
    const region = screen.getByRole("region", { name: "重要なお知らせ" })
    expect(within(region).getAllByRole("status")).toHaveLength(3)
  })

  it("hides notification and persists id on dismiss", () => {
    renderWithI18n(<NotificationBar notifications={[item({ id: "ann-1", title: "X" })]} />)
    fireEvent.click(screen.getByLabelText("閉じる"))
    expect(screen.queryByText("X")).not.toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem("news.dismissed") ?? "[]")).toEqual(["ann-1"])
  })

  it("filters out previously dismissed ids on hydrate", () => {
    window.localStorage.setItem("news.dismissed", JSON.stringify(["ann-1"]))
    renderWithI18n(<NotificationBar notifications={[
      item({ id: "ann-1", title: "hidden" }),
      item({ id: "ann-2", title: "visible" }),
    ]} />)
    expect(screen.queryByText("hidden")).not.toBeInTheDocument()
    expect(screen.getByText("visible")).toBeInTheDocument()
  })

  it("renders nothing when all notifications are dismissed", () => {
    window.localStorage.setItem("news.dismissed", JSON.stringify(["only"]))
    renderWithI18n(<NotificationBar notifications={[item({ id: "only", title: "g" })]} />)
    expect(screen.queryByRole("region")).not.toBeInTheDocument()
  })

  it("links to the source URL with target=_blank rel=noopener", () => {
    renderWithI18n(<NotificationBar notifications={[item({ id: "a", title: "x", sourceUrl: "https://example.com/x" })]} />)
    const link = screen.getByRole("link", { name: "x" })
    expect(link).toHaveAttribute("href", "https://example.com/x")
    expect(link).toHaveAttribute("target", "_blank")
    expect(link).toHaveAttribute("rel", "noopener noreferrer")
  })
})
