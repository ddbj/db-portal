import { screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import DateFieldInput from "@/components/advanced-search/DateFieldInput"

import { renderWithProviders } from "../../../helpers/providers"

describe("DateFieldInput", () => {
  it("operator=between → DatePicker が 2 個", () => {
    renderWithProviders(
      <DateFieldInput
        condition={{
          field: "date_published",
          operator: "between",
          value: { from: "2020-01-01", to: "2024-12-31" },
        }}
        onChange={vi.fn()}
      />,
    )
    const inputs = screen.getAllByPlaceholderText("YYYY-MM-DD")
    expect(inputs).toHaveLength(2)
    expect((inputs[0] as HTMLInputElement).value).toBe("2020-01-01")
    expect((inputs[1] as HTMLInputElement).value).toBe("2024-12-31")
  })

  it("operator=equals → DatePicker が 1 個", () => {
    renderWithProviders(
      <DateFieldInput
        condition={{
          field: "date_published",
          operator: "equals",
          value: "2024-01-01",
        }}
        onChange={vi.fn()}
      />,
    )
    const inputs = screen.getAllByPlaceholderText("YYYY-MM-DD")
    expect(inputs).toHaveLength(1)
    expect((inputs[0] as HTMLInputElement).value).toBe("2024-01-01")
  })

  it("operator=gte / lte も DatePicker 1 個", () => {
    const { unmount } = renderWithProviders(
      <DateFieldInput
        condition={{
          field: "date_published",
          operator: "gte",
          value: "2024-01-01",
        }}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getAllByPlaceholderText("YYYY-MM-DD")).toHaveLength(1)
    unmount()
    renderWithProviders(
      <DateFieldInput
        condition={{
          field: "date_published",
          operator: "lte",
          value: "2024-12-31",
        }}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getAllByPlaceholderText("YYYY-MM-DD")).toHaveLength(1)
  })
})
