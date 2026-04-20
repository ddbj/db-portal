import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import DbSwitchWarning from "@/components/advanced-search/DbSwitchWarning"
import { createConditionNode } from "@/lib/advanced-search/tree"
import type { AdvancedSearchState } from "@/lib/advanced-search/types"

import { renderWithProviders } from "../../../helpers/providers"

const makeState = (overrides: Partial<AdvancedSearchState>): AdvancedSearchState => ({
  mode: "single",
  db: "sra",
  tree: {
    id: "root",
    kind: "group",
    logic: "AND",
    children: [],
  },
  pendingDb: null,
  initialAdv: null,
  ...overrides,
})

describe("DbSwitchWarning", () => {
  it("pendingDb が null なら何も描画しない", () => {
    const { container } = renderWithProviders(
      <DbSwitchWarning
        state={makeState({})}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it("pendingDb あり → 見出し / DSL 列挙 / 2 ボタン", () => {
    const cond = createConditionNode({
      field: "library_strategy",
      operator: "equals",
      value: "WGS",
    })
    const { container } = renderWithProviders(
      <DbSwitchWarning
        state={makeState({
          db: "sra",
          tree: { id: "root", kind: "group", logic: "AND", children: [cond] },
          pendingDb: { next: "bioproject", toRemoveIds: [cond.id] },
        })}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    )
    expect(screen.getByText(/固有の条件が削除されます/)).toBeInTheDocument()
    const codes = container.querySelectorAll("code")
    expect(codes.length).toBe(1)
    expect(codes[0]?.textContent).toBe("library_strategy:WGS")
    expect(screen.getByRole("button", { name: "切り替える" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "キャンセル" })).toBeInTheDocument()
  })

  it("confirm / cancel クリックでコールバック呼ばれる", () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    const cond = createConditionNode({
      field: "library_strategy",
      operator: "equals",
      value: "WGS",
    })
    renderWithProviders(
      <DbSwitchWarning
        state={makeState({
          tree: { id: "root", kind: "group", logic: "AND", children: [cond] },
          pendingDb: { next: "bioproject", toRemoveIds: [cond.id] },
        })}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )
    fireEvent.click(screen.getByRole("button", { name: "切り替える" }))
    fireEvent.click(screen.getByRole("button", { name: "キャンセル" }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(1)
  })
})
