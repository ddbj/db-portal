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

  it("renders advanced mode with 1-2 conditions as raw DSL", () => {
    renderWithProviders(
      <SearchSummaryChip
        mode="advanced"
        adv="title:cancer AND organism:human"
        db="all"
        onClear={vi.fn()}
      />,
    )
    expect(screen.getByText(/title:cancer AND organism:human/)).toBeInTheDocument()
  })

  it("renders advanced mode with 3+ conditions as full DSL (省略なし)", () => {
    renderWithProviders(
      <SearchSummaryChip
        mode="advanced"
        adv="title:cancer AND organism:human AND date:2024"
        db="all"
        onClear={vi.fn()}
      />,
    )
    expect(
      screen.getByText(/title:cancer AND organism:human AND date:2024/),
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

  it("renders edit link when editHref is provided", () => {
    renderWithProviders(
      <SearchSummaryChip
        mode="advanced"
        adv="title:cancer"
        db="bioproject"
        onClear={vi.fn()}
        editHref="/advanced-search?db=bioproject&adv=title%3Acancer"
      />,
    )
    const editLink = screen.getByRole("link", { name: "編集" })
    expect(editLink.getAttribute("href")).toBe(
      "/advanced-search?db=bioproject&adv=title%3Acancer",
    )
  })

  it("renders combined mode with both q and adv", () => {
    const adv = 'organism equals "Homo sapiens"'
    renderWithProviders(
      <SearchSummaryChip
        mode="combined"
        q="human"
        adv={adv}
        db="biosample"
        onClear={vi.fn()}
      />,
    )
    expect(screen.getByText(/BioSample で絞り込み中/)).toBeInTheDocument()
    expect(
      screen.getByText(/"human" \+ organism equals "Homo sapiens"/),
    ).toBeInTheDocument()
  })
})
