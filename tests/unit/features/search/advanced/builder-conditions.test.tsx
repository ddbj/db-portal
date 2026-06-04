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
  test("andOrToggle_switchesInnerCombinator", () => {
    renderBuilder(twoConditions())
    const and = screen.getByRole("button", { name: "AND" })
    const or = screen.getByRole("button", { name: "OR" })
    // Two conditions default to AND; the segmented toggle (not a pulldown) drives
    // the whole group's combinator.
    expect(and).toHaveAttribute("aria-pressed", "true")
    expect(or).toHaveAttribute("aria-pressed", "false")

    fireEvent.click(or)

    expect(screen.getByRole("button", { name: "OR" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "AND" })).toHaveAttribute("aria-pressed", "false")
  })

  test("noConnectorWordsBetweenRows", () => {
    renderBuilder(twoConditions())
    // Connector words are gone; the toggle plus the branch guide carry the meaning.
    expect(screen.queryByText("かつ")).toBeNull()
    expect(screen.queryByText("または")).toBeNull()
  })

  test("predicateDropdown_negatesLeadingCondition", () => {
    renderBuilder(twoConditions())
    const predicates = screen.getAllByRole("combobox", { name: "条件の演算子" })
    // The leading row can be negated through its predicate — no separate exclude
    // button, and no pinned first row.
    expect(predicates[0]).toHaveTextContent("を含む")
    expect(predicates[0]).not.toHaveTextContent("を含まない")

    fireEvent.click(predicates[0] as HTMLElement)
    fireEvent.click(screen.getByRole("option", { name: "を含まない" }))

    expect(screen.getAllByRole("combobox", { name: "条件の演算子" })[0]).toHaveTextContent("を含まない")
    expect(screen.queryByRole("button", { name: "除外" })).toBeNull()
  })

  test("fieldLabels_showResolvedLabelWithoutRawField", () => {
    renderBuilder(twoConditions())
    // Default field is title → shown as "Title", never "Title (title)".
    expect(screen.getAllByText("Title").length).toBeGreaterThan(0)
    expect(screen.queryByText("Title (title)")).toBeNull()
  })
})
