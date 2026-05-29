import { fireEvent, render, screen } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import { describe, expect, test, vi } from "vitest"

import {
  AdvancedBuilder,
  type AdvancedState,
  createCondition,
  createInitialState,
} from "~/features/search"
import { createI18nInstance } from "~/lib/i18n"

type BuilderProps = Parameters<typeof AdvancedBuilder>[0]

const renderBuilder = (props: Partial<BuilderProps> = {}) => {
  const i18n = createI18nInstance("ja")
  const merged: BuilderProps = {
    state: createInitialState(),
    dispatch: vi.fn(),
    onFreeTextChange: vi.fn(),
    onFreeTextRemove: vi.fn(),
    ...props,
  }

  return {
    ...merged,
    ...render(
      <I18nextProvider i18n={i18n}>
        <AdvancedBuilder {...merged} />
      </I18nextProvider>,
    ),
  }
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

describe("AdvancedBuilder free-text row", () => {
  test("emptyKeyword_noChildren_showsEmptyPlaceholder", () => {
    renderBuilder({ freeText: "" })
    expect(screen.getByText("NO CONDITIONS")).toBeInTheDocument()
    expect(screen.queryByRole("textbox", { name: "keyword" })).toBeNull()
  })

  test("keyword_rendersFreeTextRowWithValue", () => {
    renderBuilder({ freeText: "cancer" })
    const input = screen.getByRole("textbox", { name: "keyword" })
    expect(input).toHaveValue("cancer")
    expect(screen.queryByText("NO CONDITIONS")).toBeNull()
  })

  test("blankKeyword_noChildren_showsEmptyPlaceholder", () => {
    renderBuilder({ freeText: "   " })
    expect(screen.getByText("NO CONDITIONS")).toBeInTheDocument()
  })

  test("editingFreeTextValue_callsOnFreeTextChange", () => {
    const onFreeTextChange = vi.fn()
    renderBuilder({ freeText: "cancer", onFreeTextChange })
    fireEvent.change(screen.getByRole("textbox", { name: "keyword" }), {
      target: { value: "tumor" },
    })
    expect(onFreeTextChange).toHaveBeenCalledWith("tumor")
  })

  test("removeFreeText_callsOnFreeTextRemove", () => {
    const onFreeTextRemove = vi.fn()
    renderBuilder({ freeText: "cancer", onFreeTextRemove })
    fireEvent.click(screen.getByRole("button", { name: "キーワードを削除" }))
    expect(onFreeTextRemove).toHaveBeenCalledTimes(1)
  })

  test("keywordWithStructured_firstStructuredRowLeadsWithAnd", () => {
    renderBuilder({ freeText: "cancer", state: stateWithCondition() })
    // The keyword row keeps the sole WHERE; the structured leader becomes AND.
    expect(screen.getAllByText("WHERE")).toHaveLength(1)
    expect(screen.getByText("AND")).toBeInTheDocument()
  })

  test("structuredOnly_firstRowLeadsWithWhere", () => {
    renderBuilder({ freeText: "", state: stateWithCondition() })
    expect(screen.getByText("WHERE")).toBeInTheDocument()
  })

  test("keywordWithStructured_firstConditionIsRemovable", () => {
    // The keyword row anchors WHERE, so the first structured condition (shown as
    // AND) must be removable rather than locked like a normal WHERE leader.
    renderBuilder({ freeText: "cancer", state: stateWithCondition() })
    expect(screen.getByRole("button", { name: "条件を削除" })).toBeEnabled()
  })

  test("structuredOnly_firstConditionRemoveLocked", () => {
    renderBuilder({ freeText: "", state: stateWithCondition() })
    expect(screen.getByRole("button", { name: "条件を削除" })).toBeDisabled()
  })
})
