import { fireEvent, screen } from "@testing-library/react"
import { useState } from "react"
import { describe, expect, test, vi } from "vitest"

import { NavigableSearchInput } from "~/features/search"
import type { ParseNode } from "~/lib/api"

import { renderWithStub } from "../../../_helpers/render"
import { llmHealth } from "../../../mocks/handlers"
import { server } from "../../../mocks/server"

// The done → onGenerated → navigate flow runs through a real SSE fetch, which
// jsdom cannot drive faithfully (its AbortSignal is rejected by node's fetch).
// That path is verified in the browser instead; here we cover the deterministic
// keyword / AI-mode UI wiring.

type HarnessProps = {
  allowAppend: boolean
  appendCurrentAst?: ParseNode
  onSearch: (keyword: string) => void
  onGenerated: (ast: ParseNode) => void
  searchPending?: boolean
}

const Harness = (
  { allowAppend, appendCurrentAst, onSearch, onGenerated, searchPending }: HarnessProps,
) => {
  const [keyword, setKeyword] = useState("")
  const [scope, setScope] = useState("全データベース")

  return (
    <NavigableSearchInput
      keyword={keyword}
      onKeywordChange={setKeyword}
      onSearch={onSearch}
      scope={scope}
      scopeOptions={["全データベース", "SRA"]}
      onScopeChange={setScope}
      allowAppend={allowAppend}
      appendCurrentAst={appendCurrentAst}
      onGenerated={onGenerated}
      searchPending={searchPending}
    />
  )
}

const renderInput = (props: HarnessProps) =>
  renderWithStub({
    routes: [{ path: "/", Component: () => <Harness {...props} /> }],
    initialEntries: ["/"],
  })

const noop = vi.fn()

describe("NavigableSearchInput keyword mode", () => {
  test("submit runs onSearch with the typed keyword", async () => {
    server.use(llmHealth({ status: "unset" }))
    const onSearch = vi.fn()
    renderInput({ allowAppend: true, onSearch, onGenerated: noop })

    const box = await screen.findByRole("textbox", { name: "検索キーワード" })
    fireEvent.change(box, { target: { value: "human" } })
    fireEvent.click(screen.getByRole("button", { name: "検索" }))

    expect(onSearch).toHaveBeenCalledWith("human")
  })

  test("searchPending busies the submit button", async () => {
    server.use(llmHealth({ status: "unset" }))
    const onSearch = vi.fn()
    renderInput({ allowAppend: true, onSearch, onGenerated: noop, searchPending: true })

    const submit = await screen.findByRole("button", { name: "検索中…" })
    expect(submit).toBeDisabled()
    fireEvent.click(submit)
    expect(onSearch).not.toHaveBeenCalled()
  })

  test("llmUnset hides the AI toggle", async () => {
    server.use(llmHealth({ status: "unset" }))
    renderInput({ allowAppend: true, onSearch: noop, onGenerated: noop })

    expect(await screen.findByRole("textbox", { name: "検索キーワード" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "AI モード" })).toBeNull()
  })
})

describe("NavigableSearchInput AI mode", () => {
  test("allowAppend false keeps the DB scope and offers no generation-mode selector", async () => {
    server.use(llmHealth({ status: "ok", model: "qwen" }))
    renderInput({ allowAppend: false, onSearch: noop, onGenerated: noop })

    fireEvent.click(await screen.findByRole("button", { name: "AI モード" }))

    expect(screen.getByRole("button", { name: "検索対象データベース" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "生成モード" })).toBeNull()
    // The submit label stays "検索" (not "生成") in AI mode.
    expect(screen.getByRole("button", { name: "検索" })).toBeInTheDocument()
  })

  test("allowAppend with a current query offers the generation-mode selector", async () => {
    server.use(llmHealth({ status: "ok", model: "qwen" }))
    const current: ParseNode = { op: "contains", field: "title", value: "cancer" }
    renderInput({ allowAppend: true, appendCurrentAst: current, onSearch: noop, onGenerated: noop })

    fireEvent.click(await screen.findByRole("button", { name: "AI モード" }))

    const modeTrigger = screen.getByRole("button", { name: "生成モード" })
    expect(modeTrigger).toHaveTextContent("既存に追加")
  })

  test("never renders the in-place proposal review card", async () => {
    server.use(llmHealth({ status: "ok", model: "qwen" }))
    renderInput({ allowAppend: true, onSearch: noop, onGenerated: noop })

    fireEvent.click(await screen.findByRole("button", { name: "AI モード" }))

    // The navigate flow hands the AST off instead of reviewing it in place, so
    // the builder's proposal heading is never present.
    expect(screen.queryByText("AI による生成結果")).toBeNull()
  })
})
