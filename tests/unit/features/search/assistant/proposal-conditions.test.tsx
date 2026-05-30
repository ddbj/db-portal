import { render, screen } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import { describe, expect, test } from "vitest"

import { ProposalConditions } from "~/features/search/assistant/proposal-conditions"
import type { ParseNode } from "~/lib/api"
import { createI18nInstance } from "~/lib/i18n"

const renderNode = (node: ParseNode) => {
  const i18n = createI18nInstance("ja")

  return render(
    <I18nextProvider i18n={i18n}>
      <ProposalConditions node={node} />
    </I18nextProvider>,
  )
}

describe("ProposalConditions", () => {
  test("singleLeaf_readsAsClauseWithoutCombinator", () => {
    renderNode({ op: "eq", field: "organism_name", value: "Homo sapiens" })
    // Plain Japanese field label, not the raw snake_case field.
    expect(screen.getByText("学名")).toBeInTheDocument()
    expect(screen.queryByText("organism_name")).toBeNull()
    expect(screen.getByText("と一致")).toBeInTheDocument()
    expect(screen.getByText("Homo sapiens")).toBeInTheDocument()
    // A lone clause carries no combinator badge.
    expect(screen.queryByText("AND")).toBeNull()
    expect(screen.queryByText("すべてに一致")).toBeNull()
  })

  test("andGroup_showsAndBadgeAndEachClause", () => {
    renderNode({
      op: "AND",
      rules: [
        { op: "eq", field: "organism_name", value: "Homo sapiens" },
        { op: "contains", field: "title", value: "single cell" },
        { op: "between", field: "date_published", from: "2022-01-01", to: "2024-12-31" },
      ],
    })
    expect(screen.getByText("AND")).toBeInTheDocument()
    expect(screen.getByText("すべてに一致")).toBeInTheDocument()
    expect(screen.getByText("学名")).toBeInTheDocument()
    expect(screen.getByText("タイトル")).toBeInTheDocument()
    expect(screen.getByText("公開日")).toBeInTheDocument()
    expect(screen.getByText("を含む")).toBeInTheDocument()
    expect(screen.getByText("の期間内")).toBeInTheDocument()
    expect(screen.getByText("2022-01-01 〜 2024-12-31")).toBeInTheDocument()
  })

  test("orGroup_showsOrBadge", () => {
    renderNode({
      op: "OR",
      rules: [
        { op: "eq", field: "organism_name", value: "Homo sapiens" },
        { op: "eq", field: "organism_name", value: "Mus musculus" },
      ],
    })
    expect(screen.getByText("OR")).toBeInTheDocument()
    expect(screen.getByText("いずれかに一致")).toBeInTheDocument()
    expect(screen.getByText("Homo sapiens")).toBeInTheDocument()
    expect(screen.getByText("Mus musculus")).toBeInTheDocument()
  })

  test("nestedGroup_showsBothCombinators", () => {
    renderNode({
      op: "AND",
      rules: [
        { op: "contains", field: "title", value: "cancer" },
        {
          op: "OR",
          rules: [
            { op: "eq", field: "organism_name", value: "Homo sapiens" },
            { op: "eq", field: "organism_name", value: "Mus musculus" },
          ],
        },
      ],
    })
    expect(screen.getByText("AND")).toBeInTheDocument()
    expect(screen.getByText("OR")).toBeInTheDocument()
  })

  test("notOfValueLeaf_foldsIntoNegatedPredicate", () => {
    renderNode({
      op: "NOT",
      rules: [{ op: "eq", field: "accessibility", value: "controlled-access" }],
    })
    // A negated single leaf reads as the negated predicate, no NOT badge.
    expect(screen.getByText("と一致しない")).toBeInTheDocument()
    expect(screen.getByText("controlled-access")).toBeInTheDocument()
    expect(screen.queryByText("NOT")).toBeNull()
    expect(screen.queryByText("除外")).toBeNull()
  })

  test("notOfRangeLeaf_foldsIntoNegatedBetween", () => {
    renderNode({
      op: "NOT",
      rules: [{ op: "between", field: "date_published", from: "2022-01-01", to: "2024-12-31" }],
    })
    expect(screen.getByText("の期間外")).toBeInTheDocument()
    expect(screen.queryByText("NOT")).toBeNull()
  })

  test("notOfGroup_showsNotBadge", () => {
    renderNode({
      op: "NOT",
      rules: [
        {
          op: "OR",
          rules: [
            { op: "eq", field: "organism_name", value: "Homo sapiens" },
            { op: "eq", field: "organism_name", value: "Mus musculus" },
          ],
        },
      ],
    })
    expect(screen.getByText("NOT")).toBeInTheDocument()
    expect(screen.getByText("除外")).toBeInTheDocument()
    expect(screen.getByText("OR")).toBeInTheDocument()
  })

  test("notOfFreeText_showsNotBadgeWithKeywordClause", () => {
    renderNode({
      op: "NOT",
      rules: [{ op: "free_text", value: "draft", is_phrase: false }],
    })
    expect(screen.getByText("NOT")).toBeInTheDocument()
    expect(screen.getByText("キーワード")).toBeInTheDocument()
    expect(screen.getByText("draft")).toBeInTheDocument()
  })

  test("freeText_bareWord_showsKeywordClause", () => {
    renderNode({ op: "free_text", value: "cancer", is_phrase: false })
    expect(screen.getByText("キーワード")).toBeInTheDocument()
    expect(screen.getByText("cancer")).toBeInTheDocument()
    expect(screen.queryByText("フレーズ")).toBeNull()
  })

  test("freeText_phrase_quotesValueAndMarksPhrase", () => {
    renderNode({ op: "free_text", value: "single cell", is_phrase: true })
    expect(screen.getByText('"single cell"')).toBeInTheDocument()
    expect(screen.getByText("フレーズ")).toBeInTheDocument()
  })

  test("wildcardLeaf_usesPatternPredicate", () => {
    renderNode({ op: "wildcard", field: "identifier", value: "PRJDB*" })
    expect(screen.getByText("パターンに一致")).toBeInTheDocument()
    expect(screen.getByText("PRJDB*")).toBeInTheDocument()
  })

  test("unknownField_fallsBackToRawName", () => {
    // The parse AST may carry Tier 3 / alias fields with no plain-Japanese label.
    renderNode({ op: "eq", field: "library_strategy", value: "WGS" })
    expect(screen.getByText("library_strategy")).toBeInTheDocument()
    expect(screen.getByText("WGS")).toBeInTheDocument()
  })

  test("identityAst_rendersNothing", () => {
    const { container } = renderNode({ op: "AND", rules: [] })
    expect(container.textContent).toBe("")
  })

  test("notWithEmptyRules_rendersNothing", () => {
    const { container } = renderNode({ op: "NOT", rules: [] })
    expect(container.textContent).toBe("")
  })

  test("singleChildGroup_dropsCombinatorBadge", () => {
    renderNode({
      op: "AND",
      rules: [{ op: "contains", field: "title", value: "cancer" }],
    })
    // A one-child AND carries no join meaning, so the badge is omitted.
    expect(screen.queryByText("AND")).toBeNull()
    expect(screen.queryByText("すべてに一致")).toBeNull()
    expect(screen.getByText("タイトル")).toBeInTheDocument()
  })
})
