import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"

import { DateFacet } from "~/ui/date-facet"

describe("DateFacet", () => {
  test("DateFacet_default_rendersFourSegmentedRanges", () => {
    render(<DateFacet />)
    expect(screen.getByRole("button", { name: "すべて" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "1年" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "5年" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "10年" })).toBeInTheDocument()
  })

  test("DateFacet_activeRange_setsAriaPressedTrue", () => {
    render(<DateFacet active="5y" />)
    expect(screen.getByRole("button", { name: "5年" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "1年" })).toHaveAttribute("aria-pressed", "false")
  })

  test("DateFacet_activeRange_appliesBrandSoftPalette", () => {
    render(<DateFacet active="1y" />)
    const active = screen.getByRole("button", { name: "1年" })
    expect(active).toHaveClass("bg-brand-soft")
    expect(active).toHaveClass("text-brand-deep")
    expect(active).toHaveClass("border-brand/35")
  })

  test("DateFacet_inactiveRange_appliesNeutralPalette", () => {
    render(<DateFacet active="1y" />)
    const inactive = screen.getByRole("button", { name: "5年" })
    expect(inactive).toHaveClass("bg-transparent")
    expect(inactive).toHaveClass("text-ink-mid")
    expect(inactive).toHaveClass("border-border-soft")
  })

  test("DateFacet_onRangeChange_invokedWithKey", () => {
    const onRangeChange = vi.fn()
    render(<DateFacet onRangeChange={onRangeChange} />)
    fireEvent.click(screen.getByRole("button", { name: "5年" }))
    expect(onRangeChange).toHaveBeenCalledWith("5y")
  })

  test("DateFacet_fromTo_renderInputsWithValues", () => {
    render(<DateFacet from="2020-01-01" to="2024-12-31" />)
    const fromInput = screen.getByLabelText("開始日") as HTMLInputElement
    const toInput = screen.getByLabelText("終了日") as HTMLInputElement
    expect(fromInput.value).toBe("2020-01-01")
    expect(toInput.value).toBe("2024-12-31")
  })

  test("DateFacet_onFromChange_invokedWithValue", () => {
    const onFromChange = vi.fn()
    render(<DateFacet onFromChange={onFromChange} />)
    fireEvent.change(screen.getByLabelText("開始日"), { target: { value: "2024-01-01" } })
    expect(onFromChange).toHaveBeenCalledWith("2024-01-01")
  })

  test("DateFacet_customLabel_rendersGroupLabel", () => {
    render(<DateFacet label="公開期間" />)
    expect(screen.getByText("公開期間")).toBeInTheDocument()
  })

  test("DateFacet_appliedCountWithOnClear_rendersClearButton", () => {
    const onClear = vi.fn()
    render(<DateFacet appliedCount={1} onClear={onClear} />)
    fireEvent.click(screen.getByRole("button", { name: "解除" }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  test("DateFacet_appliedCountZero_doesNotRenderClearButton", () => {
    render(<DateFacet appliedCount={0} onClear={() => undefined} />)
    expect(screen.queryByRole("button", { name: "解除" })).toBeNull()
  })
})
