import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import SearchSummaryChip, {
  countAdvConditions,
} from "@/components/search/SearchSummaryChip"

import { renderWithProviders } from "../../../helpers/providers"

describe("countAdvConditions", () => {

  it("returns 0 for empty string", () => {
    expect(countAdvConditions("")).toBe(0)
    expect(countAdvConditions("   ")).toBe(0)
  })

  it("returns 1 for a single condition", () => {
    expect(countAdvConditions("title:cancer")).toBe(1)
  })

  it("counts AND/OR separators", () => {
    expect(countAdvConditions("title:cancer AND organism:human")).toBe(2)
    expect(countAdvConditions("a AND b OR c")).toBe(3)
    expect(countAdvConditions("a AND b AND c AND d")).toBe(4)
  })

  it("is case-insensitive for operators", () => {
    expect(countAdvConditions("a and b")).toBe(2)
  })
})

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

  it("truncates long simple query", () => {
    const long = "a".repeat(80)
    renderWithProviders(
      <SearchSummaryChip mode="simple" q={long} db="all" onClear={vi.fn()} />,
    )
    const node = screen.getByText(/a+…/)
    expect(node.textContent!.length).toBeLessThanOrEqual(50)
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

  it("renders advanced mode with 3+ conditions as first-plus-count", () => {
    renderWithProviders(
      <SearchSummaryChip
        mode="advanced"
        adv="title:cancer AND organism:human AND date:2024"
        db="all"
        onClear={vi.fn()}
      />,
    )
    expect(screen.getByText(/title:cancer 他 2 条件/)).toBeInTheDocument()
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
})
