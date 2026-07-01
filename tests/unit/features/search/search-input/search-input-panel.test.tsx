import { fireEvent, screen } from "@testing-library/react"
import { useReducer, useState } from "react"
import { describe, expect, test, vi } from "vitest"

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

type HarnessProps = {
  initial: AdvancedState
  invalid?: boolean
  onSubmitSearch?: (keyword: string) => void
  searchPending?: boolean
}

const Harness = ({ initial, invalid = false, onSubmitSearch, searchPending }: HarnessProps) => {
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
      invalid={invalid}
      onSubmitSearch={onSubmitSearch}
      searchPending={searchPending}
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

const renderPanel = (
  initial: AdvancedState,
  invalid = false,
  extra: Omit<HarnessProps, "initial" | "invalid"> = {},
) =>
  renderWithStub({
    routes: [
      { path: "/", Component: () => <Harness initial={initial} invalid={invalid} {...extra} /> },
    ],
    initialEntries: ["/"],
  })

describe("SearchInputPanel AI mode", () => {
  test("llmUnset_hidesAiToggle", async () => {
    server.use(llmHealth({ status: "unset" }))
    renderPanel(createInitialState())
    // Keyword input is present; the AI toggle never appears.
    expect(await screen.findByRole("textbox", { name: "検索キーワード" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "AI クエリビルダー" })).toBeNull()
  })

  test("toggle_entersAiMode_swapsInputAndScopeToMode", async () => {
    server.use(llmHealth({ status: "ok", model: "qwen" }))
    renderPanel(createInitialState())
    const toggle = await screen.findByRole("button", { name: "AI クエリビルダー" })
    expect(toggle).toHaveAttribute("aria-pressed", "false")
    // The keyword box and its database scope picker are present in keyword mode.
    expect(screen.getByRole("textbox", { name: "検索キーワード" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /検索対象データベース/ })).toBeInTheDocument()

    fireEvent.click(toggle)

    // AI mode swaps to the prompt input and repurposes the scope picker into the
    // generation-mode picker.
    expect(toggle).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("textbox", { name: "AI クエリビルダーへの入力" })).toBeInTheDocument()
    expect(screen.queryByRole("textbox", { name: "検索キーワード" })).toBeNull()
    expect(screen.queryByRole("button", { name: /検索対象データベース/ })).toBeNull()
    expect(screen.getByRole("button", { name: /生成モード/ })).toBeInTheDocument()
  })

  test("toggle_pressedAgain_returnsToKeywordInput", async () => {
    server.use(llmHealth({ status: "ok", model: "qwen" }))
    renderPanel(stateWithCondition())
    const toggle = await screen.findByRole("button", { name: "AI クエリビルダー" })
    fireEvent.click(toggle)
    expect(screen.getByRole("textbox", { name: "AI クエリビルダーへの入力" })).toBeInTheDocument()

    fireEvent.click(toggle)

    expect(toggle).toHaveAttribute("aria-pressed", "false")
    expect(screen.getByRole("textbox", { name: "検索キーワード" })).toBeInTheDocument()
    expect(screen.queryByRole("textbox", { name: "AI クエリビルダーへの入力" })).toBeNull()
  })

  test("emptyBuilder_entersAiMode_defaultsNewAndDisablesAppend", async () => {
    server.use(llmHealth({ status: "ok", model: "qwen" }))
    renderPanel(createInitialState())
    fireEvent.click(await screen.findByRole("button", { name: "AI クエリビルダー" }))
    // The mode is chosen before generating via the repurposed scope dropdown;
    // an empty builder defaults to "新規生成" and "既存に追加" is listed but disabled.
    const modeTrigger = screen.getByRole("button", { name: /生成モード/ })
    expect(modeTrigger).toHaveTextContent("新規生成")
    fireEvent.click(modeTrigger)
    const appendOption = screen.getByRole("option", { name: "既存に追加" })
    expect(appendOption).toBeInTheDocument()
    expect(appendOption).toBeDisabled()
  })

  test("builderWithConditions_entersAiMode_defaultsAppendAndEnablesBoth", async () => {
    server.use(llmHealth({ status: "ok", model: "qwen" }))
    renderPanel(stateWithCondition())
    fireEvent.click(await screen.findByRole("button", { name: "AI クエリビルダー" }))
    const modeTrigger = screen.getByRole("button", { name: /生成モード/ })
    expect(modeTrigger).toHaveTextContent("既存に追加")
    fireEvent.click(modeTrigger)
    expect(screen.getByRole("option", { name: "新規生成" })).not.toBeDisabled()
    expect(screen.getByRole("option", { name: "既存に追加" })).not.toBeDisabled()
  })
})

describe("SearchInputPanel keyword validation", () => {
  test("invalid_marksKeywordBoxAndShowsMessage", async () => {
    server.use(llmHealth({ status: "ok", model: "qwen" }))
    renderPanel(createInitialState(), true)
    const box = await screen.findByRole("textbox", { name: "検索キーワード" })
    expect(box).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText("キーワードの構文が正しくありません")).toBeInTheDocument()
  })

  test("invalid_ignoredInAiMode", async () => {
    server.use(llmHealth({ status: "ok", model: "qwen" }))
    renderPanel(createInitialState(), true)
    fireEvent.click(await screen.findByRole("button", { name: "AI クエリビルダー" }))
    // The AI prompt box is a different input, so keyword validation does not
    // bleed into AI mode.
    expect(screen.getByRole("textbox", { name: "AI クエリビルダーへの入力" })).not.toHaveAttribute(
      "aria-invalid",
      "true",
    )
    expect(screen.queryByText("キーワードの構文が正しくありません")).toBeNull()
  })
})

describe("SearchInputPanel keyword submit", () => {
  test("box submit runs the search (not just a keyword commit)", async () => {
    server.use(llmHealth({ status: "unset" }))
    const onSubmitSearch = vi.fn()
    renderPanel(createInitialState(), false, { onSubmitSearch })

    const box = await screen.findByRole("textbox", { name: "検索キーワード" })
    fireEvent.change(box, { target: { value: "cancer" } })
    fireEvent.click(screen.getByRole("button", { name: "検索" }))

    expect(onSubmitSearch).toHaveBeenCalledWith("cancer")
  })

  test("searchPending busies the box submit button", async () => {
    server.use(llmHealth({ status: "unset" }))
    const onSubmitSearch = vi.fn()
    renderPanel(createInitialState(), false, { onSubmitSearch, searchPending: true })

    const submit = await screen.findByRole("button", { name: "検索中…" })
    expect(submit).toBeDisabled()
    fireEvent.click(submit)
    expect(onSubmitSearch).not.toHaveBeenCalled()
  })
})
