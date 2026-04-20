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
      />,
    )
    expect(screen.getByText(/全 189,923 件中 1-20 件/)).toBeInTheDocument()
  })

  it("renders 10k over form when isOver10kLimit", () => {
    renderWithProviders(
      <SearchToolbar
        total={15234}
        page={1}
        perPage={20}
        sort="relevance"
        onSortChange={vi.fn()}
        onPerPageChange={vi.fn()}
        isOver10kLimit={true}
      />,
    )
    expect(screen.getByText(/10,000 件以上 1-20 件/)).toBeInTheDocument()
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
      />,
    )
    expect(screen.getByText(/全 0 件中 0-0 件/)).toBeInTheDocument()
  })
})
