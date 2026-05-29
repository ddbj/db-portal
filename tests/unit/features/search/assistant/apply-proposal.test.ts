import { describe, expect, test } from "vitest"

import { applyProposalToAdvanced, type AssistantProposal, createInitialState } from "~/features/search"

const collectConditions = (state: ReturnType<typeof createInitialState>) =>
  state.root.children.filter((child) => child.kind === "condition")

describe("applyProposalToAdvanced", () => {
  test("betweenCondition_keepsFromAndTo", () => {
    const proposal: AssistantProposal = {
      combinator: "AND",
      conditions: [
        { field: "date_published", op: "between", from: "2023-01-01", to: "2023-12-31" },
      ],
    }
    const next = applyProposalToAdvanced(createInitialState(), proposal)
    const [condition] = collectConditions(next)
    expect(condition?.op).toBe("between")
    expect(condition?.from).toBe("2023-01-01")
    expect(condition?.to).toBe("2023-12-31")
    expect(condition?.value).toBe("")
  })

  test("scalarCondition_keepsValue", () => {
    const proposal: AssistantProposal = {
      combinator: "AND",
      conditions: [
        { field: "organism_name", op: "eq", value: "Homo sapiens" },
      ],
    }
    const next = applyProposalToAdvanced(createInitialState(), proposal)
    const [condition] = collectConditions(next)
    expect(condition?.op).toBe("eq")
    expect(condition?.field).toBe("organism_name")
    expect(condition?.value).toBe("Homo sapiens")
    expect(condition?.from).toBe("")
    expect(condition?.to).toBe("")
  })

  test("mixedConditions_eachPreservesItsPayload", () => {
    const proposal: AssistantProposal = {
      combinator: "AND",
      conditions: [
        { field: "organism_name", op: "contains", value: "Mus musculus" },
        { field: "date_published", op: "between", from: "2020-01-01", to: "2021-12-31" },
      ],
    }
    const next = applyProposalToAdvanced(createInitialState(), proposal)
    const conditions = collectConditions(next)
    expect(conditions).toHaveLength(2)
    const between = conditions.find((c) => c.op === "between")
    expect(between?.from).toBe("2020-01-01")
    expect(between?.to).toBe("2021-12-31")
  })
})
