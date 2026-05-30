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
    const input = screen.getByRole("textbox", { name: "キーワード" })
    expect(input).toHaveValue("cancer")
    expect(screen.queryByText("NO CONDITIONS")).toBeNull()
  })

  test("keyword_rowDescribesSearchScopeHonestly", () => {
    renderBuilder({ freeText: "cancer" })
    // The honest scope label replaces the old "すべての項目から検索" lie; the exact
    // 5 default fields live in the ⓘ tooltip, hidden until interaction.
    expect(screen.getByText("おもな項目を全文検索")).toBeInTheDocument()
    expect(screen.queryByText("すべての項目から検索")).toBeNull()
    expect(screen.queryByRole("tooltip")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "おもな項目を全文検索" }))

    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "アクセッション・タイトル・名称・説明・生物種名 を対象に検索します",
    )
  })

  test("blankKeyword_noChildren_showsEmptyPlaceholder", () => {
    renderBuilder({ freeText: "   " })
    expect(screen.getByText("NO CONDITIONS")).toBeInTheDocument()
  })

  test("editingFreeTextValue_callsOnFreeTextChange", () => {
    const onFreeTextChange = vi.fn()
    renderBuilder({ freeText: "cancer", onFreeTextChange })
    fireEvent.change(screen.getByRole("textbox", { name: "キーワード" }), {
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

  test("keywordWithStructured_showsNoConnectorWords", () => {
    renderBuilder({ freeText: "cancer", state: stateWithCondition() })
    // Connector words are gone entirely; grouping reads from the AND/OR toggle and
    // the branch guide, and the SQL-flavoured "WHERE" never appears.
    expect(screen.queryByText("かつ")).toBeNull()
    expect(screen.queryByText("または")).toBeNull()
    expect(screen.queryByText("WHERE")).toBeNull()
  })

  test("structuredCondition_isRemovableWithoutKeyword", () => {
    renderBuilder({ freeText: "", state: stateWithCondition() })
    // Every condition is independently removable now — there is no pinned leading
    // row, so removing the only condition just returns to the empty state.
    expect(screen.getByRole("button", { name: "条件を削除" })).toBeEnabled()
  })
})
