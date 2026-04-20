import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import AdvancedSearchRow from "@/components/advanced-search/AdvancedSearchRow"
import { ADVANCED_FIELDS } from "@/lib/mock-data"

import { renderWithProviders } from "../../../helpers/providers"

describe("AdvancedSearchRow", () => {
  it("value input に現在値が表示される", () => {
    renderWithProviders(
      <AdvancedSearchRow
        condition={{ field: "title", operator: "contains", value: "cancer" }}
        availableFields={ADVANCED_FIELDS}
        onChange={vi.fn()}
        onRemove={vi.fn()}
        hasLogicPrefix={false}
      />,
    )
    expect((screen.getByDisplayValue("cancer") as HTMLInputElement).value)
      .toBe("cancer")
  })

  it("hasLogicPrefix=true で logic select が追加表示される", () => {
    renderWithProviders(
      <AdvancedSearchRow
        condition={{ field: "title", operator: "contains", value: "a" }}
        availableFields={ADVANCED_FIELDS}
        onChange={vi.fn()}
        onRemove={vi.fn()}
        hasLogicPrefix
        logic="AND"
        onLogicChange={vi.fn()}
      />,
    )
    // select 要素が少なくとも 2 個（logic + operator）
    const selects = document.querySelectorAll("select")
    expect(selects.length).toBeGreaterThanOrEqual(2)
  })

  it("onRemove クリックでハンドラ呼ばれる", () => {
    const onRemove = vi.fn()
    renderWithProviders(
      <AdvancedSearchRow
        condition={{ field: "title", operator: "contains", value: "a" }}
        availableFields={ADVANCED_FIELDS}
        onChange={vi.fn()}
        onRemove={onRemove}
        hasLogicPrefix={false}
      />,
    )
    const removeBtn = screen.getByRole("button", { name: "条件を削除" })
    fireEvent.click(removeBtn)
    expect(onRemove).toHaveBeenCalled()
  })

  it("enum 型 (library_strategy, 選択肢 > 5) → Combobox 描画", () => {
    renderWithProviders(
      <AdvancedSearchRow
        condition={{
          field: "library_strategy",
          operator: "equals",
          value: "WGS",
        }}
        availableFields={ADVANCED_FIELDS}
        onChange={vi.fn()}
        onRemove={vi.fn()}
        hasLogicPrefix={false}
      />,
    )
    // library_strategy は 8 値で Combobox 描画
    const comboboxes = screen.getAllByRole("combobox")
    expect(comboboxes.length).toBeGreaterThanOrEqual(2)
  })

  it("enum 型 (library_layout, 選択肢 ≤ 5) → Select 描画", () => {
    renderWithProviders(
      <AdvancedSearchRow
        condition={{
          field: "library_layout",
          operator: "equals",
          value: "SINGLE",
        }}
        availableFields={ADVANCED_FIELDS}
        onChange={vi.fn()}
        onRemove={vi.fn()}
        hasLogicPrefix={false}
      />,
    )
    // SINGLE / PAIRED の 2 値なので Select
    const selects = document.querySelectorAll("select")
    // field ≠ select (Combobox), operator = select, value = select → 2 個
    expect(selects.length).toBeGreaterThanOrEqual(2)
  })
})
