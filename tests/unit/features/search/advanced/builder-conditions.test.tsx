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
    const and = screen.getByRole("radio", { name: "AND" })
    const or = screen.getByRole("radio", { name: "OR" })
    // Two conditions default to AND; the segmented toggle (radiogroup) drives
    // the whole group's combinator.
    expect(and).toHaveAttribute("aria-checked", "true")
    expect(or).toHaveAttribute("aria-checked", "false")

    fireEvent.click(or)

    expect(screen.getByRole("radio", { name: "OR" })).toHaveAttribute("aria-checked", "true")
    expect(screen.getByRole("radio", { name: "AND" })).toHaveAttribute("aria-checked", "false")
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
    expect(predicates[0]).toHaveTextContent("keyword")
    expect(predicates[0]).not.toHaveTextContent("not keyword")

    fireEvent.click(predicates[0] as HTMLElement)
    fireEvent.click(screen.getByRole("option", { name: "not keyword" }))

    expect(screen.getAllByRole("combobox", { name: "条件の演算子" })[0]).toHaveTextContent("not keyword")
    expect(screen.queryByRole("button", { name: "除外" })).toBeNull()
  })

  test("fieldLabels_showResolvedLabelWithoutRawField", () => {
    renderBuilder(twoConditions())
    // Default field is title → shown as "Title", never "Title (title)".
    expect(screen.getAllByText("Title").length).toBeGreaterThan(0)
    expect(screen.queryByText("Title (title)")).toBeNull()
  })
})
