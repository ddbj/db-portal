import { fireEvent, screen } from "@testing-library/react"
import { describe, expect, test, vi } from "vitest"

import { SwitchableQueryPreview } from "~/features/search"
import type { ParseNode } from "~/lib/api"

import { renderWithStub } from "../../../_helpers/render"

const ast: ParseNode = {
  op: "AND",
  rules: [
    { op: "free_text", value: "human", is_phrase: false },
    { op: "between", field: "date_published", from: "2022-01-01", to: "2024-12-31" },
  ],
}

const render = (
  props: {
    dsl: string
    ast: ParseNode | null
    onClear?: () => void
    onEdit?: () => void
  },
) =>
  renderWithStub({
    routes: [{ path: "/", Component: () => <SwitchableQueryPreview {...props} /> }],
    initialEntries: ["/"],
    withQuery: false,
  })

describe("SwitchableQueryPreview", () => {
  test("defaults to the DSL view", () => {
    render({ dsl: "human AND date_published:[2022-01-01 TO 2024-12-31]", ast })
    expect(screen.getByLabelText("クエリプレビュー")).toHaveTextContent(
      "human AND date_published:[2022-01-01 TO 2024-12-31]",
    )
  })

  test("toggles to the read-only builder graph", () => {
    render({ dsl: "human AND date_published:[2022-01-01 TO 2024-12-31]", ast })
    fireEvent.click(screen.getByRole("button", { name: "グラフ" }))
    // The graph renders field labels / values rather than the raw DSL string.
    expect(screen.queryByLabelText("クエリプレビュー")).toBeNull()
    expect(screen.getByText("human")).toBeInTheDocument()
  })

  test("toggling back returns to the DSL view", () => {
    render({ dsl: "human", ast })
    fireEvent.click(screen.getByRole("button", { name: "グラフ" }))
    fireEvent.click(screen.getByRole("button", { name: "DSL" }))
    expect(screen.getByLabelText("クエリプレビュー")).toHaveTextContent("human")
  })

  test("clear and edit buttons fire their callbacks when provided", () => {
    const onClear = vi.fn()
    const onEdit = vi.fn()
    render({ dsl: "human", ast, onClear, onEdit })
    fireEvent.click(screen.getByRole("button", { name: "クエリビルダーで編集" }))
    fireEvent.click(screen.getByRole("button", { name: "クリア" }))
    expect(onEdit).toHaveBeenCalledOnce()
    expect(onClear).toHaveBeenCalledOnce()
  })

  test("clear and edit buttons are absent without callbacks", () => {
    render({ dsl: "human", ast })
    expect(screen.queryByRole("button", { name: "クリア" })).toBeNull()
    expect(screen.queryByRole("button", { name: "クエリビルダーで編集" })).toBeNull()
  })
})
