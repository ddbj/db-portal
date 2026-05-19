import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import Pagination from "@/components/search/Pagination"

import { renderWithProviders } from "../../../helpers/providers"

describe("Pagination", () => {

  it("renders current page in input and total in label", () => {
    renderWithProviders(
      <Pagination page={3} totalPages={10} onChange={vi.fn()} />,
    )
    const input = screen.getByRole("spinbutton") as HTMLInputElement
    expect(input.value).toBe("3")
    expect(screen.getByText(/\/ 10/)).toBeInTheDocument()
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

  it("jumps to first page when first button clicked", () => {
    const onChange = vi.fn()
    renderWithProviders(
      <Pagination page={5} totalPages={10} onChange={onChange} />,
    )
    fireEvent.click(screen.getByRole("button", { name: "最初" }))
    expect(onChange).toHaveBeenCalledWith(1)
  })

  it("jumps to last page when last button clicked", () => {
    const onChange = vi.fn()
    renderWithProviders(
      <Pagination page={3} totalPages={10} onChange={onChange} />,
    )
    fireEvent.click(screen.getByRole("button", { name: "最後" }))
    expect(onChange).toHaveBeenCalledWith(10)
  })

  it("uses maxJumpPage as last page ceiling when smaller than totalPages", () => {
    const onChange = vi.fn()
    renderWithProviders(
      <Pagination
        page={1}
        totalPages={1000}
        onChange={onChange}
        maxJumpPage={500}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "最後" }))
    expect(onChange).toHaveBeenCalledWith(500)
  })

  it("commits page input on Enter", () => {
    const onChange = vi.fn()
    renderWithProviders(
      <Pagination page={1} totalPages={10} onChange={onChange} />,
    )
    const input = screen.getByRole("spinbutton") as HTMLInputElement
    fireEvent.change(input, { target: { value: "7" } })
    fireEvent.keyDown(input, { key: "Enter" })
    expect(onChange).toHaveBeenCalledWith(7)
  })

  it("clamps page input to valid range on blur", () => {
    const onChange = vi.fn()
    renderWithProviders(
      <Pagination page={1} totalPages={10} onChange={onChange} />,
    )
    const input = screen.getByRole("spinbutton") as HTMLInputElement
    fireEvent.change(input, { target: { value: "9999" } })
    fireEvent.blur(input)
    expect(onChange).toHaveBeenCalledWith(10)
  })
})
