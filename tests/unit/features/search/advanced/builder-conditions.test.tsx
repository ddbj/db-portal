import { fireEvent, render, screen } from "@testing-library/react"
import { useReducer } from "react"
import { I18nextProvider } from "react-i18next"
import { describe, expect, test } from "vitest"

import {
  AdvancedBuilder,
  advancedReducer,
  type AdvancedState,
  createCondition,
  createInitialState,
} from "~/features/search"
import { createI18nInstance } from "~/lib/i18n"

const twoConditions = (): AdvancedState => {
  const base = createInitialState()

  return { root: { ...base.root, children: [createCondition(), createCondition()] } }
}

const Harness = ({ initial }: { initial: AdvancedState }) => {
  const [state, dispatch] = useReducer(advancedReducer, initial)

  return <AdvancedBuilder state={state} dispatch={dispatch} />
}

const renderBuilder = (initial: AdvancedState) => {
  const i18n = createI18nInstance("ja")

  return render(
    <I18nextProvider i18n={i18n}>
      <Harness initial={initial} />
    </I18nextProvider>,
  )
}

describe("AdvancedBuilder conditions", () => {
  test("matchSelector_switchesConnectorWord", () => {
    renderBuilder(twoConditions())
    // Two conditions default to "match all" → the rows read joined by "かつ".
    expect(screen.getByText("かつ")).toBeInTheDocument()
    expect(screen.queryByText("または")).toBeNull()

    fireEvent.click(screen.getByRole("combobox", { name: "クエリビルダーの条件一覧" }))
    fireEvent.click(screen.getByRole("option", { name: "いずれかの条件に一致" }))

    // Switching to "match any" flips the inline connector to "または".
    expect(screen.getByText("または")).toBeInTheDocument()
    expect(screen.queryByText("かつ")).toBeNull()
  })

  test("excludeToggle_leadingRowDisabled_othersNegate", () => {
    renderBuilder(twoConditions())
    const excludes = screen.getAllByRole("button", { name: "除外" })
    expect(excludes).toHaveLength(2)
    // The leading condition is pinned to AND by the reducer, so it cannot be
    // negated; the second can.
    expect(excludes[0]).toBeDisabled()
    expect(excludes[1]).not.toBeDisabled()
    expect(excludes[1]).toHaveAttribute("aria-pressed", "false")

    fireEvent.click(excludes[1] as HTMLElement)

    expect(screen.getAllByRole("button", { name: "除外" })[1]).toHaveAttribute("aria-pressed", "true")
  })

  test("fieldLabels_areJapaneseOnly", () => {
    renderBuilder(twoConditions())
    // Default field is title → shown as "タイトル", never "タイトル (title)".
    expect(screen.getAllByText("タイトル").length).toBeGreaterThan(0)
    expect(screen.queryByText("タイトル (title)")).toBeNull()
  })
})
