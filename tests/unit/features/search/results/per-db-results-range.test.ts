import { screen } from "@testing-library/react"
import { createElement } from "react"
import { describe, expect, test, vi } from "vitest"

import { PerDbResults } from "~/features/search/results/per-db-results"
import type { DbSearchResponse } from "~/lib/api"
import type { PerPageValue, SortKey } from "~/lib/search-scope"

import { renderWithStub } from "../../../_helpers/render"

const EMPTY_LABEL = "条件に一致する結果がありません"

const response = (total: number): DbSearchResponse =>
  ({
    total,
    hits: [],
    hardLimitReached: false,
    page: 1,
    perPage: 20,
  }) as unknown as DbSearchResponse

const renderRange = (
  total: number,
  page: number,
  perPage: PerPageValue,
): void => {
  renderWithStub({
    routes: [{
      path: "/",
      Component: () =>
        createElement(PerDbResults, {
          db: "bioproject",
          response: response(total),
          lang: "ja",
          page,
          perPage,
          sort: "relevance" as SortKey,
          onPageChange: vi.fn(),
          onPerPageChange: vi.fn(),
          onSortChange: vi.fn(),
        }),
    }],
    initialEntries: ["/"],
    lang: "ja",
  })
}

// The range summary is rendered with the ja resource
// "{{total}} 件中 {{start}}-{{end}}" where each number is formatted via
// toLocaleString("en-US"). These tests pin computeRange / totalPages boundaries
// through that rendered string.
const summary = (total: number, start: number, end: number): string =>
  `${total.toLocaleString("en-US")} 件中 ${start.toLocaleString("en-US")}-${end.toLocaleString("en-US")}`

describe("PerDbResults range summary boundaries", () => {
  test("PerDbResults_totalZero_rendersCountAndSingleEmptyNotice", () => {
    renderRange(0, 1, 20)
    // total=0 shows the count "0 件" in the header summary and the empty notice
    // exactly once in the body Callout (the message is not duplicated across
    // header and body); computeRange returns {0,0} so the range never appears.
    expect(screen.getByText("0 件")).toBeInTheDocument()
    expect(screen.getAllByText(EMPTY_LABEL)).toHaveLength(1)
    expect(screen.queryByText(/件中/)).toBeNull()
  })

  test("PerDbResults_perPageMultipleExact_endEqualsTotal", () => {
    // total=100, perPage=50, page=2 -> start=(2-1)*50+1=51, end=min(100,100)=100.
    renderRange(100, 2, 50)
    expect(screen.getByText(summary(100, 51, 100))).toBeInTheDocument()
  })

  test("PerDbResults_firstPage_startIsOneNotZero", () => {
    // off-by-one guard: start = (page-1)*perPage+1, so page 1 starts at 1.
    renderRange(100, 1, 50)
    expect(screen.getByText(summary(100, 1, 50))).toBeInTheDocument()
  })

  test("PerDbResults_lastPagePartial_endClampsToTotal", () => {
    // total=99, perPage=50, page=2 -> start=51, end=min(99,100)=99 (remainder).
    renderRange(99, 2, 50)
    expect(screen.getByText(summary(99, 51, 99))).toBeInTheDocument()
  })

  test("PerDbResults_lastPageSingleRemainder_startEqualsEnd", () => {
    // total=101, perPage=50: page 3 holds a single hit -> start=101, end=101.
    renderRange(101, 3, 50)
    expect(screen.getByText(summary(101, 101, 101))).toBeInTheDocument()
  })

  test("PerDbResults_totalSmallerThanPerPage_endEqualsTotal", () => {
    // total=7, perPage=50, page=1 -> start=1, end=min(7,50)=7. totalPages=1.
    renderRange(7, 1, 50)
    expect(screen.getByText(summary(7, 1, 7))).toBeInTheDocument()
  })

  test("PerDbResults_thousandsSeparatorFormatting_localizesNumbers", () => {
    // toLocaleString("en-US") inserts comma group separators on each number.
    // total=10000, perPage=50, page=200 -> start=9951, end=10000.
    renderRange(10000, 200, 50)
    expect(screen.getByText("10,000 件中 9,951-10,000")).toBeInTheDocument()
  })

  test("PerDbResults_pageBeyondLastPage_startExceedsTotal", () => {
    // Overflow page: total=100, perPage=50 has totalPages=2, but page=3 yields
    // start=(3-1)*50+1=101 while end=min(100,150)=100, so start>end>total.
    // computeRange does not clamp start, so the summary reports 101-100.
    renderRange(100, 3, 50)
    expect(screen.getByText(summary(100, 101, 100))).toBeInTheDocument()
  })
})
