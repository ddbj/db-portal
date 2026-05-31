import { screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"

import { PerDbResults } from "~/features/search/results/per-db-results"
import type { DbSearchResponse } from "~/lib/api"

import { renderWithStub } from "../../_helpers/render"

const HARD_LIMIT_LABEL = "上位 10,000 件まで表示しています"

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
  test("PerDbResults_hardLimitReached_showsCollapsedInfoHintTrigger", () => {
    renderPerDb(response({ total: 12345, hardLimitReached: true }))
    // The notice is an ⓘ trigger, not always-on text: the button carries the
    // message as its accessible name, and the tooltip stays collapsed until
    // the user hovers / clicks.
    expect(screen.getByRole("button", { name: HARD_LIMIT_LABEL })).toBeInTheDocument()
    expect(screen.queryByRole("tooltip")).toBeNull()
  })

  test("PerDbResults_notHardLimited_hidesInfoHintTrigger", () => {
    renderPerDb(response({ total: 42, hardLimitReached: false }))
    expect(screen.queryByRole("button", { name: HARD_LIMIT_LABEL })).toBeNull()
  })

  test("PerDbResults_always_rendersCountSortAndPerPageTogether", () => {
    renderPerDb(response({ total: 42, hardLimitReached: false }))
    expect(screen.getByText("42 件中 1-20")).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "並び替え" })).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "1 ページあたり" })).toBeInTheDocument()
  })
})
