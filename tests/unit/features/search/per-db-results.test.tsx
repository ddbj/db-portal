import { screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"

import { PerDbResults } from "~/features/search/results/per-db-results"
import type { DbSearchResponse } from "~/lib/api"

import { renderWithStub } from "../../_helpers/render"

const HARD_LIMIT_BADGE = "上位 10,000 件まで"

const response = (o: Record<string, unknown>): DbSearchResponse =>
  ({
    total: 0,
    hits: [],
    hardLimitReached: false,
    page: 1,
    perPage: 20,
    ...o,
  }) as unknown as DbSearchResponse

const renderPerDb = (resp: DbSearchResponse) =>
  renderWithStub({
    routes: [{
      path: "/",
      Component: () => (
        <PerDbResults
          db="bioproject"
          response={resp}
          lang="ja"
          onPageChange={vi.fn()}
          onPerPageChange={vi.fn()}
          onSortChange={vi.fn()}
        />
      ),
    }],
    initialEntries: ["/"],
    lang: "ja",
  })

describe("PerDbResults toolbar", () => {
  test("PerDbResults_hardLimitReached_showsAlwaysOnLimitBadge", () => {
    renderPerDb(response({ total: 12345, hardLimitReached: true }))
    // The notice is always-on text, not a collapsed tooltip: a warn badge in the
    // toolbar states the cap inline next to the hit count.
    expect(screen.getByText(HARD_LIMIT_BADGE)).toBeInTheDocument()
  })

  test("PerDbResults_notHardLimited_hidesLimitBadge", () => {
    renderPerDb(response({ total: 42, hardLimitReached: false }))
    expect(screen.queryByText(HARD_LIMIT_BADGE)).toBeNull()
  })

  test("PerDbResults_totalExceedsDeepPagingLimit_capsPaginationAtReachablePage", () => {
    renderPerDb(response({ total: 50000, hardLimitReached: true }))
    // total=50000 / perPage=20 would be 2,500 pages, but page * perPage > 10000
    // is rejected by the API, so pagination must stop at page 500 (=10000/20)
    // and never offer the uncapped last page.
    expect(screen.getAllByRole("button", { name: "500 ページ目へ" }).length).toBeGreaterThan(0)
    expect(screen.queryByRole("button", { name: "2500 ページ目へ" })).toBeNull()
  })

  test("PerDbResults_always_rendersCountSortAndPerPageTogether", () => {
    renderPerDb(response({ total: 42, hardLimitReached: false }))
    expect(screen.getByText("42 件中 1-20")).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "並び替え" })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "1 ページあたり" })).toBeInTheDocument()
  })
})
