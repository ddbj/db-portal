import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import Pagination from "@/components/search/Pagination"

import { renderWithProviders } from "../../../helpers/providers"

describe("Pagination", () => {

  it("renders page info", () => {
    renderWithProviders(
      <Pagination page={3} totalPages={10} onChange={vi.fn()} />,
    )
    expect(screen.getByText(/3 \/ 10/)).toBeInTheDocument()
  })

  it("disables prev on page 1", () => {
    renderWithProviders(
      <Pagination page={1} totalPages={10} onChange={vi.fn()} />,
    )
    const prev = screen.getByRole("button", { name: "前へ" })
    expect(prev).toBeDisabled()
  })

  it("disables next on last page", () => {
    renderWithProviders(
      <Pagination page={10} totalPages={10} onChange={vi.fn()} />,
    )
    const next = screen.getByRole("button", { name: "次へ" })
    expect(next).toBeDisabled()
  })

  it("disables next when hardLimitReached is true", () => {
    renderWithProviders(
      <Pagination
        page={500}
        totalPages={1000}
        onChange={vi.fn()}
        hardLimitReached={true}
      />,
    )
    const next = screen.getByRole("button", { name: "次へ" })
    expect(next).toBeDisabled()
  })

  it("calls onChange with page - 1 when prev clicked", () => {
    const onChange = vi.fn()
    renderWithProviders(
      <Pagination page={3} totalPages={10} onChange={onChange} />,
    )
    fireEvent.click(screen.getByRole("button", { name: "前へ" }))
    expect(onChange).toHaveBeenCalledWith(2)
  })

  it("calls onChange with page + 1 when next clicked", () => {
    const onChange = vi.fn()
    renderWithProviders(
      <Pagination page={3} totalPages={10} onChange={onChange} />,
    )
    fireEvent.click(screen.getByRole("button", { name: "次へ" }))
    expect(onChange).toHaveBeenCalledWith(4)
  })
})
