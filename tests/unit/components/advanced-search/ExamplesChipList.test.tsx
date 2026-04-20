import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import ExamplesChipList from "@/components/advanced-search/ExamplesChipList"
import { ADVANCED_EXAMPLES } from "@/lib/mock-data"

import { renderWithProviders } from "../../../helpers/providers"

describe("ExamplesChipList", () => {
  it("6 個の Example を描画", () => {
    renderWithProviders(<ExamplesChipList onApply={vi.fn()} />)
    expect(ADVANCED_EXAMPLES).toHaveLength(6)
    expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(6)
  })

  it("チップクリックで onApply が呼ばれる", () => {
    const onApply = vi.fn()
    renderWithProviders(<ExamplesChipList onApply={onApply} />)
    const buttons = screen.getAllByRole("button")
    const firstChip = buttons[0]
    if (!firstChip) throw new Error("no chip")
    fireEvent.click(firstChip)
    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onApply.mock.calls[0]?.[0]?.id).toBe(ADVANCED_EXAMPLES[0]?.id)
  })
})
