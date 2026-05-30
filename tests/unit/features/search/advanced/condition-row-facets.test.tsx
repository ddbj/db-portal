import { fireEvent, render, screen } from "@testing-library/react"
import { useReducer } from "react"
import { I18nextProvider } from "react-i18next"
import { describe, expect, test } from "vitest"

import {
  AdvancedBuilder,
  type AdvancedCondition,
  advancedReducer,
  type AdvancedState,
  createCondition,
  createInitialState,
} from "~/features/search"
import type { DbPortalFacets } from "~/lib/api"
import { createI18nInstance } from "~/lib/i18n"
import type { DbSlug } from "~/lib/search-scope"

const conditionWith = (patch: Partial<AdvancedCondition>): AdvancedState => {
  const base = createInitialState()
  const cond: AdvancedCondition = { ...createCondition(), ...patch }

  return { root: { ...base.root, children: [cond] } }
}

const Harness = ({
  initial,
  db,
  facets,
}: {
  initial: AdvancedState
  db: DbSlug | null
  facets: DbPortalFacets | null
}) => {
  const [state, dispatch] = useReducer(advancedReducer, initial)

  return <AdvancedBuilder state={state} dispatch={dispatch} db={db} facets={facets} />
}

const renderRow = (
  initial: AdvancedState,
  db: DbSlug | null,
  facets: DbPortalFacets | null,
) => {
  const i18n = createI18nInstance("ja")

  return render(
    <I18nextProvider i18n={i18n}>
      <Harness initial={initial} db={db} facets={facets} />
    </I18nextProvider>,
  )
}

const accessibilityFacets = (): DbPortalFacets =>
  ({
    accessibility: [
      { value: "public-access", count: 178688362 },
      { value: "controlled-access", count: 4874590 },
    ],
  }) as DbPortalFacets

describe("ConditionRow facet value input", () => {
  test("facetableField_rendersValueAsCombobox", () => {
    // accessibility is an enum facet in cross scope → value input is a combobox.
    renderRow(conditionWith({ field: "accessibility", op: "eq" }), null, accessibilityFacets())
    expect(screen.getByRole("combobox", { name: "値を入力" })).toBeInTheDocument()
  })

  test("nonFacetableField_rendersValueAsPlainTextbox", () => {
    // title is free text → no facet row, so the value input stays a plain textbox.
    renderRow(conditionWith({ field: "title", op: "contains" }), null, accessibilityFacets())
    expect(screen.queryByRole("combobox", { name: "値を入力" })).toBeNull()
    expect(screen.getByRole("textbox", { name: "値を入力" })).toBeInTheDocument()
  })

  test("facetableField_listsScopeBucketsAsOptions", () => {
    renderRow(conditionWith({ field: "accessibility", op: "eq" }), null, accessibilityFacets())
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "値を入力" }))
    expect(screen.getByRole("option", { name: /public-access/ })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: /controlled-access/ })).toBeInTheDocument()
  })

  test("facetableField_withoutFacetData_stillRendersComboboxWithNoOptions", () => {
    // The combobox is chosen by the field being facetable, not by data presence;
    // with null facets it is still editable free text, just with no suggestions.
    renderRow(conditionWith({ field: "accessibility", op: "eq" }), null, null)
    const input = screen.getByRole("combobox", { name: "値を入力" })
    fireEvent.mouseDown(input)
    expect(screen.queryByRole("option")).toBeNull()
  })

  test("organismField_optionLabelShowsScientificNameWithTaxId", () => {
    const facets = { organism: [{ value: "9606", count: 20253242, label: "Homo sapiens" }] }
    renderRow(
      conditionWith({ field: "organism_id", op: "eq" }),
      null,
      facets as DbPortalFacets,
    )
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "値を入力" }))
    // organism shows the scientific name + taxID label; the option's value (what
    // gets committed) is the taxID itself.
    const option = screen.getAllByRole("option")[0] as HTMLElement
    expect(option.textContent).toContain("Homo sapiens (9606)")
    fireEvent.click(option)
    const valueInput = screen.getByRole("combobox", { name: "値を入力" }) as HTMLInputElement
    expect(valueInput.value).toBe("9606")
  })

  test("dateField_keepsRangeInputsNotCombobox", () => {
    // A date field uses the FROM/TO range inputs regardless of facet data; the
    // value input is never a facet combobox (date inputs have no textbox role).
    renderRow(conditionWith({ field: "date_published", op: "between" }), null, accessibilityFacets())
    expect(screen.queryByRole("combobox", { name: "値を入力" })).toBeNull()
    expect(screen.getByLabelText("FROM")).toBeInTheDocument()
    expect(screen.getByLabelText("TO")).toBeInTheDocument()
  })

  test("perDbFacetField_rendersComboboxInThatScope", () => {
    // library_strategy is a per-DB (sra) enum facet; in sra scope it is facetable.
    const facets = {
      libraryStrategy: [
        { value: "WGS", count: 8481091 },
        { value: "AMPLICON", count: 17275513 },
      ],
    }
    renderRow(
      conditionWith({ field: "library_strategy", op: "eq" }),
      "sra",
      facets as DbPortalFacets,
    )
    fireEvent.mouseDown(screen.getByRole("combobox", { name: "値を入力" }))
    expect(screen.getByRole("option", { name: /WGS/ })).toBeInTheDocument()
  })
})
