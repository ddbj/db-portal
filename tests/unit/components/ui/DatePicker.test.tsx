import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import DatePicker from "@/components/ui/DatePicker"

describe("DatePicker", () => {

  it("displays the selected date in yyyy-MM-dd format", () => {
    const date = new Date("2024-03-15T00:00:00")
    render(<DatePicker value={date} onChange={() => undefined} />)
    expect(screen.getByPlaceholderText("YYYY-MM-DD")).toHaveValue("2024-03-15")
  })

  it("calls onChange(Date) when text input is parsed as a valid date", () => {
    const onChange = vi.fn()
    render(<DatePicker value={undefined} onChange={onChange} />)
    const input = screen.getByPlaceholderText("YYYY-MM-DD")
    fireEvent.change(input, { target: { value: "2024-12-31" } })
    expect(onChange).toHaveBeenCalledTimes(1)
    const arg = onChange.mock.calls[0]?.[0] as Date
    expect(arg.getFullYear()).toBe(2024)
    expect(arg.getMonth()).toBe(11)
    expect(arg.getDate()).toBe(31)
  })

  it("calls onChange(undefined) when text is cleared", () => {
    const onChange = vi.fn()
    render(<DatePicker value={new Date("2024-03-15T00:00:00")} onChange={onChange} />)
    const input = screen.getByPlaceholderText("YYYY-MM-DD")
    fireEvent.change(input, { target: { value: "" } })
    expect(onChange).toHaveBeenCalledWith(undefined)
  })

  it("does not call onChange for invalid date strings", () => {
    const onChange = vi.fn()
    render(<DatePicker value={undefined} onChange={onChange} />)
    const input = screen.getByPlaceholderText("YYYY-MM-DD")
    fireEvent.change(input, { target: { value: "not-a-date" } })
    expect(onChange).not.toHaveBeenCalled()
  })
})
