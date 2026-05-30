import { render, screen } from "@testing-library/react"
import { I18nextProvider } from "react-i18next"
import { describe, expect, test } from "vitest"

import type { AssistantProposal } from "~/features/search/assistant"
import { ProposalConditions } from "~/features/search/assistant/proposal-conditions"
import { createI18nInstance } from "~/lib/i18n"

const renderProposal = (proposal: AssistantProposal) => {
  const i18n = createI18nInstance("ja")

  return render(
    <I18nextProvider i18n={i18n}>
      <ProposalConditions proposal={proposal} />
    </I18nextProvider>,
  )
}

describe("ProposalConditions", () => {
  test("rendersBuilderStyleClausesWithJoinOperator", () => {
    const proposal: AssistantProposal = {
      combinator: "AND",
      conditions: [
        { field: "organism_name", op: "eq", value: "Homo sapiens" },
        { field: "title", op: "contains", value: "single cell" },
        { field: "date_published", op: "between", from: "2022-01-01", to: "2024-12-31" },
      ],
    }
    renderProposal(proposal)
    // Plain Japanese field labels, not the raw snake_case field names.
    expect(screen.getByText("学名")).toBeInTheDocument()
    expect(screen.getByText("タイトル")).toBeInTheDocument()
    expect(screen.getByText("公開日")).toBeInTheDocument()
    expect(screen.queryByText("organism_name")).toBeNull()
    // Predicate labels read like the builder rows.
    expect(screen.getByText("と一致")).toBeInTheDocument()
    expect(screen.getByText("を含む")).toBeInTheDocument()
    expect(screen.getByText("の期間内")).toBeInTheDocument()
    // Values, including a formatted range.
    expect(screen.getByText("Homo sapiens")).toBeInTheDocument()
    expect(screen.getByText("2022-01-01 〜 2024-12-31")).toBeInTheDocument()
    // The join operator appears between adjacent conditions (n-1 connectors).
    expect(screen.getAllByText("AND")).toHaveLength(2)
  })

  test("orCombinator_showsOrBetweenConditions", () => {
    const proposal: AssistantProposal = {
      combinator: "OR",
      conditions: [
        { field: "title", op: "contains", value: "cancer" },
        { field: "title", op: "contains", value: "tumor" },
      ],
    }
    renderProposal(proposal)
    expect(screen.getByText("OR")).toBeInTheDocument()
  })

  test("singleCondition_hasNoJoinOperator", () => {
    const proposal: AssistantProposal = {
      combinator: "AND",
      conditions: [{ field: "identifier", op: "wildcard", value: "PRJDB*" }],
    }
    renderProposal(proposal)
    expect(screen.queryByText("AND")).toBeNull()
  })
})
