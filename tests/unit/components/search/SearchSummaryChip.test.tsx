import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import SearchSummaryChip from "@/components/search/SearchSummaryChip"

import { renderWithProviders } from "../../../helpers/providers"

describe("SearchSummaryChip", () => {

  it("renders simple mode with all-db prefix", () => {
    renderWithProviders(
      <SearchSummaryChip mode="simple" q="human" db="all" onClear={vi.fn()} />,
    )
    expect(screen.getByText(/全データベースで絞り込み中/)).toBeInTheDocument()
    expect(screen.getByText("human")).toBeInTheDocument()
  })

  it("renders simple mode with db-name prefix", () => {
    renderWithProviders(
      <SearchSummaryChip mode="simple" q="human" db="bioproject" onClear={vi.fn()} />,
    )
    expect(screen.getByText(/BioProject で絞り込み中/)).toBeInTheDocument()
  })

  it("does not truncate long simple query (CSS で折り返し)", () => {
    const long = "a".repeat(80)
    renderWithProviders(
      <SearchSummaryChip mode="simple" q={long} db="all" onClear={vi.fn()} />,
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
      />,
    )
    expect(
      screen.getByText(/title:cancer AND organism:"Homo sapiens"/),
    ).toBeInTheDocument()
  })

  it("calls onClear when clear button clicked", () => {
    const onClear = vi.fn()
    renderWithProviders(
      <SearchSummaryChip mode="simple" q="human" db="all" onClear={onClear} />,
    )
    fireEvent.click(screen.getByRole("button", { name: "検索条件をクリア" }))
    expect(onClear).toHaveBeenCalled()
  })
})
