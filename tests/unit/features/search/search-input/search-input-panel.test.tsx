import { fireEvent, screen } from "@testing-library/react"
import { useReducer, useState } from "react"
import { describe, expect, test } from "vitest"

import {
  advancedReducer,
  type AdvancedState,
  createCondition,
  createInitialState,
  SearchInputPanel,
} from "~/features/search"

import { renderWithStub } from "../../../_helpers/render"
import { llmHealth } from "../../../mocks/handlers"
import { server } from "../../../mocks/server"

const Harness = ({ initial }: { initial: AdvancedState }) => {
  const [keyword, setKeyword] = useState("")
  const [advancedState, dispatch] = useReducer(advancedReducer, initial)
  const [scope, setScope] = useState("全データベース")

  return (
    <SearchInputPanel
      keyword={keyword}
      onKeywordChange={setKeyword}
      scope={scope}
      scopeOptions={["全データベース"]}
      onScopeChange={setScope}
      advancedState={advancedState}
      dispatch={dispatch}
    />
  )
}

const stateWithCondition = (): AdvancedState => {
  const base = createInitialState()

  return {
    root: {
      ...base.root,
      children: [createCondition({ field: "organism_name", op: "eq", value: "Homo sapiens" })],
    },
  }
}

const renderPanel = (initial: AdvancedState) =>
  renderWithStub({
    routes: [{ path: "/", Component: () => <Harness initial={initial} /> }],
    initialEntries: ["/"],
  })

describe("SearchInputPanel AI mode", () => {
  test("llmUnset_hidesAiToggle", async () => {
    server.use(llmHealth({ status: "unset" }))
    renderPanel(createInitialState())
    // Keyword input is present; the AI toggle never appears.
    expect(await screen.findByRole("textbox", { name: "検索キーワード" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "AI モード" })).toBeNull()
  })

  test("emptyBuilder_entersAiMode_defaultsNewAndDisablesAppend", async () => {
    server.use(llmHealth({ status: "ok", model: "qwen" }))
    renderPanel(createInitialState())
    fireEvent.click(await screen.findByRole("button", { name: "AI モード" }))
    const newBtn = screen.getByRole("button", { name: "新規生成" })
    const appendBtn = screen.getByRole("button", { name: "既存に追加" })
    expect(newBtn).toHaveAttribute("aria-pressed", "true")
    expect(appendBtn).toBeDisabled()
  })

  test("builderWithConditions_entersAiMode_defaultsAppend", async () => {
    server.use(llmHealth({ status: "ok", model: "qwen" }))
    renderPanel(stateWithCondition())
    fireEvent.click(await screen.findByRole("button", { name: "AI モード" }))
    const appendBtn = screen.getByRole("button", { name: "既存に追加" })
    expect(appendBtn).not.toBeDisabled()
    expect(appendBtn).toHaveAttribute("aria-pressed", "true")
  })

  test("exitAiMode_returnsToKeywordInput", async () => {
    server.use(llmHealth({ status: "ok", model: "qwen" }))
    renderPanel(stateWithCondition())
    fireEvent.click(await screen.findByRole("button", { name: "AI モード" }))
    fireEvent.click(screen.getByRole("button", { name: "AI モードを終了" }))
    expect(screen.getByRole("textbox", { name: "検索キーワード" })).toBeInTheDocument()
  })
})
