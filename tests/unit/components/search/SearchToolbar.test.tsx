import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import SearchToolbar from "@/components/search/SearchToolbar"

import { renderWithProviders } from "../../../helpers/providers"

describe("SearchToolbar", () => {

  it("renders result count in normal form", () => {
    renderWithProviders(
      <SearchToolbar
        total={189923}
        page={1}
        perPage={20}
        sort="relevance"
        onSortChange={vi.fn()}
        onPerPageChange={vi.fn()}
        totalPages={9497}
        onPageChange={vi.fn()}
      />,
    )
    expect(screen.getByText(/全 189,923 件中 1-20 件/)).toBeInTheDocument()
  })

  it("renders actual total even when isOver10kLimit, and shows inline 10k note", () => {
    renderWithProviders(
      <SearchToolbar
        total={4_000_000}
        page={1}
        perPage={20}
        sort="relevance"
        onSortChange={vi.fn()}
        onPerPageChange={vi.fn()}
        isOver10kLimit={true}
        totalPages={500}
        onPageChange={vi.fn()}
      />,
    )
    expect(screen.getByText(/全 4,000,000 件中 1-20 件/)).toBeInTheDocument()
    expect(screen.getByText("最大 10,000 件まで表示可能")).toBeInTheDocument()
  })

  it("does not render inline 10k note when not over 10k", () => {
    renderWithProviders(
      <SearchToolbar
        total={120}
        page={1}
        perPage={20}
        sort="relevance"
        onSortChange={vi.fn()}
        onPerPageChange={vi.fn()}
        totalPages={6}
        onPageChange={vi.fn()}
      />,
    )
    expect(
      screen.queryByText("最大 10,000 件まで表示可能"),
    ).not.toBeInTheDocument()
  })

  it("calls onSortChange with new sort value", () => {
    const onSort = vi.fn()
    renderWithProviders(
      <SearchToolbar
        total={100}
        page={1}
        perPage={20}
        sort="relevance"
        onSortChange={onSort}
        onPerPageChange={vi.fn()}
        totalPages={5}
        onPageChange={vi.fn()}
      />,
    )
    const sortSelect = screen.getAllByRole("combobox")[0]!
    fireEvent.change(sortSelect, { target: { value: "date_desc" } })
    expect(onSort).toHaveBeenCalledWith("date_desc")
  })

  it("calls onPerPageChange with new perPage as number", () => {
    const onPerPage = vi.fn()
    renderWithProviders(
      <SearchToolbar
        total={100}
        page={1}
        perPage={20}
        sort="relevance"
        onSortChange={vi.fn()}
        onPerPageChange={onPerPage}
        totalPages={5}
        onPageChange={vi.fn()}
      />,
    )
    const perPageSelect = screen.getAllByRole("combobox")[1]!
    fireEvent.change(perPageSelect, { target: { value: "50" } })
    expect(onPerPage).toHaveBeenCalledWith(50)
  })

  it("shows 0-0 of 0 when total is zero", () => {
    renderWithProviders(
      <SearchToolbar
        total={0}
        page={1}
        perPage={20}
        sort="relevance"
        onSortChange={vi.fn()}
        onPerPageChange={vi.fn()}
        totalPages={1}
        onPageChange={vi.fn()}
      />,
    )
    expect(screen.getByText(/全 0 件中 0-0 件/)).toBeInTheDocument()
  })

  it("renders embedded pagination with page input and total", () => {
    renderWithProviders(
      <SearchToolbar
        total={100}
        page={3}
        perPage={20}
        sort="relevance"
        onSortChange={vi.fn()}
        onPerPageChange={vi.fn()}
        totalPages={5}
        onPageChange={vi.fn()}
      />,
    )
    const input = screen.getByRole("spinbutton") as HTMLInputElement
    expect(input.value).toBe("3")
    expect(screen.getByText(/\/ 5/)).toBeInTheDocument()
  })

  it("calls onPageChange when next is clicked", () => {
    const onPage = vi.fn()
    renderWithProviders(
      <SearchToolbar
        total={100}
        page={2}
        perPage={20}
        sort="relevance"
        onSortChange={vi.fn()}
        onPerPageChange={vi.fn()}
        totalPages={5}
        onPageChange={onPage}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: /次へ|Next/ }))
    expect(onPage).toHaveBeenCalledWith(3)
  })
})
