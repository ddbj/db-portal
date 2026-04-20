import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import AdvancedSearchGroup from "@/components/advanced-search/AdvancedSearchGroup"
import { createConditionNode, createGroupNode } from "@/lib/advanced-search/tree"
import type { AdvancedGroupNode } from "@/lib/advanced-search/types"
import { ALL_DB_VALUE } from "@/lib/search-url"

import { renderWithProviders } from "../../../helpers/providers"

const emptyRoot = (): AdvancedGroupNode => ({
  id: "root",
  kind: "group",
  logic: "AND",
  children: [],
})

describe("AdvancedSearchGroup", () => {
  it("depth=0 で children 0 → EmptyState 表示", () => {
    renderWithProviders(
      <AdvancedSearchGroup
        group={emptyRoot()}
        path={[]}
        depth={0}
        db={ALL_DB_VALUE}
        dispatch={vi.fn()}
      />,
    )
    expect(
      screen.getByText(/条件が未設定です/),
    ).toBeInTheDocument()
  })

  it("子 condition あり → AdvancedSearchRow 描画", () => {
    const cond = createConditionNode({
      field: "title",
      operator: "contains",
      value: "cancer",
    })
    renderWithProviders(
      <AdvancedSearchGroup
        group={{ ...emptyRoot(), children: [cond] }}
        path={[]}
        depth={0}
        db={ALL_DB_VALUE}
        dispatch={vi.fn()}
      />,
    )
    expect((screen.getByDisplayValue("cancer") as HTMLInputElement).value)
      .toBe("cancer")
  })

  it("depth=3 で addGroup active", () => {
    renderWithProviders(
      <AdvancedSearchGroup
        group={emptyRoot()}
        path={[]}
        depth={3}
        db={ALL_DB_VALUE}
        dispatch={vi.fn()}
      />,
    )
    expect(
      screen.getByRole("button", { name: /\+ グループを追加/ }),
    ).not.toBeDisabled()
  })

  it("depth=5 で addGroup が disabled", () => {
    renderWithProviders(
      <AdvancedSearchGroup
        group={emptyRoot()}
        path={[]}
        depth={5}
        db={ALL_DB_VALUE}
        dispatch={vi.fn()}
      />,
    )
    expect(
      screen.getByRole("button", { name: /\+ グループを追加/ }),
    ).toBeDisabled()
  })

  it("NOT group で子 1 個あると「+ 条件を追加」が disable", () => {
    const cond = createConditionNode({
      field: "title",
      operator: "contains",
      value: "cancer",
    })
    const notGroup: AdvancedGroupNode = {
      ...createGroupNode("NOT"),
      children: [cond],
    }
    renderWithProviders(
      <AdvancedSearchGroup
        group={notGroup}
        path={[0]}
        depth={1}
        db={ALL_DB_VALUE}
        dispatch={vi.fn()}
      />,
    )
    const addCondBtn = screen.getByRole("button", {
      name: /\+ 条件を追加/,
    })
    expect(addCondBtn).toBeDisabled()
  })

  it("ADD_CONDITION ボタンクリックで dispatch が呼ばれる", () => {
    const dispatch = vi.fn()
    renderWithProviders(
      <AdvancedSearchGroup
        group={emptyRoot()}
        path={[]}
        depth={0}
        db={ALL_DB_VALUE}
        dispatch={dispatch}
      />,
    )
    const btn = screen.getByRole("button", { name: /\+ 条件を追加/ })
    fireEvent.click(btn)
    expect(dispatch).toHaveBeenCalledWith({ type: "ADD_CONDITION", path: [] })
  })
})
