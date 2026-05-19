import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import SearchSummaryChip from "@/components/search/SearchSummaryChip"

import { renderWithProviders } from "../../../helpers/providers"

const HREF = "/advanced-search?q=human"

describe("SearchSummaryChip", () => {

  it("renders simple mode with all-db prefix", () => {
    renderWithProviders(
      <SearchSummaryChip
        mode="simple"
        q="human"
        db="all"
        onClear={vi.fn()}
        advancedSearchHref={HREF}
      />,
    )
    expect(screen.getByText(/全データベースで絞り込み中/)).toBeInTheDocument()
    expect(screen.getByText("human")).toBeInTheDocument()
  })

  it("renders simple mode with db-name prefix", () => {
    renderWithProviders(
      <SearchSummaryChip
        mode="simple"
        q="human"
        db="bioproject"
        onClear={vi.fn()}
        advancedSearchHref={HREF}
      />,
    )
    expect(screen.getByText(/BioProject で絞り込み中/)).toBeInTheDocument()
  })

  it("does not truncate long simple query (CSS で折り返し)", () => {
    const long = "a".repeat(80)
    renderWithProviders(
      <SearchSummaryChip
        mode="simple"
        q={long}
        db="all"
        onClear={vi.fn()}
        advancedSearchHref={HREF}
      />,
    )
    expect(screen.getByText(long)).toBeInTheDocument()
  })

  it("renders DSL-style q as-is in the chip", () => {
    renderWithProviders(
      <SearchSummaryChip
        mode="simple"
        q={'title:cancer AND organism:"Homo sapiens"'}
        db="all"
        onClear={vi.fn()}
        advancedSearchHref={HREF}
      />,
    )
    expect(
      screen.getByText(/title:cancer AND organism:"Homo sapiens"/),
    ).toBeInTheDocument()
  })

  it("calls onClear when clear button clicked", () => {
    const onClear = vi.fn()
    renderWithProviders(
      <SearchSummaryChip
        mode="simple"
        q="human"
        db="all"
        onClear={onClear}
        advancedSearchHref={HREF}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "検索条件をクリア" }))
    expect(onClear).toHaveBeenCalled()
  })

  it("renders edit link pointing to advancedSearchHref", () => {
    const href = "/search?db=sra&q=human"
    renderWithProviders(
      <SearchSummaryChip
        mode="simple"
        q="human"
        db="sra"
        onClear={vi.fn()}
        advancedSearchHref={href}
      />,
    )
    const link = screen.getByRole("link", { name: /検索画面で編集/ })
    expect(link).toHaveAttribute("href", href)
  })

  it("renders edit link for cross-mode (db=all) without db param", () => {
    const href = "/search?q=human"
    renderWithProviders(
      <SearchSummaryChip
        mode="simple"
        q="human"
        db="all"
        onClear={vi.fn()}
        advancedSearchHref={href}
      />,
    )
    expect(
      screen.getByRole("link", { name: /検索画面で編集/ }),
    ).toHaveAttribute("href", href)
  })
})
