import { describe, expect, test } from "vitest"

import type { AdvancedState } from "~/features/search"
import {
  applyProposalByMode,
  type AssistantProposal,
  builderConditionCount,
  createCondition,
  createInitialState,
  resolveAiModeDefault,
} from "~/features/search"

const stateWith = (childCount: number): AdvancedState => {
  const base = createInitialState()

  return {
    root: {
      ...base.root,
      children: Array.from({ length: childCount }, () => createCondition()),
    },
  }
}

const proposal: AssistantProposal = {
  combinator: "AND",
  conditions: [{ field: "organism_name", op: "eq", value: "Homo sapiens" }],
}

describe("builderConditionCount", () => {
  test("emptyKeyword_noChildren_isZero", () => {
    expect(builderConditionCount("", createInitialState())).toBe(0)
  })

  test("blankKeyword_isTreatedAsEmpty", () => {
    expect(builderConditionCount("   ", createInitialState())).toBe(0)
  })

  test("keywordOnly_countsOne", () => {
    expect(builderConditionCount("cancer", createInitialState())).toBe(1)
  })

  test("structuredOnly_countsChildren", () => {
    expect(builderConditionCount("", stateWith(2))).toBe(2)
  })

  test("keywordPlusStructured_sumsBoth", () => {
    expect(builderConditionCount("cancer", stateWith(2))).toBe(3)
  })
})

describe("resolveAiModeDefault", () => {
  test("zeroConditions_defaultsNewAndDisablesAppend", () => {
    expect(resolveAiModeDefault(0)).toEqual({ mode: "new", appendDisabled: true })
  })

  test("oneCondition_defaultsAppend", () => {
    expect(resolveAiModeDefault(1)).toEqual({ mode: "append", appendDisabled: false })
  })

  test("manyConditions_defaultsAppend", () => {
    expect(resolveAiModeDefault(5)).toEqual({ mode: "append", appendDisabled: false })
  })

  test("negativeGuard_treatedAsEmpty", () => {
    expect(resolveAiModeDefault(-1)).toEqual({ mode: "new", appendDisabled: true })
  })
})

describe("applyProposalByMode", () => {
  test("append_keepsExistingChildrenAndAddsProposal", () => {
    const next = applyProposalByMode("append", stateWith(2), proposal)
    expect(next.root.children).toHaveLength(3)
  })

  test("new_discardsExistingChildrenAndKeepsOnlyProposal", () => {
    const next = applyProposalByMode("new", stateWith(2), proposal)
    const conditions = next.root.children.filter((c) => c.kind === "condition")
    expect(conditions).toHaveLength(1)
    expect(conditions.map((c) => ({ field: c.field, op: c.op, value: c.value }))).toEqual([
      { field: "organism_name", op: "eq", value: "Homo sapiens" },
    ])
  })

  test("new_fromEmpty_producesSameConditionsAsAppendFromEmpty", () => {
    const stripIds = (s: ReturnType<typeof applyProposalByMode>) =>
      s.root.children.map((c) => (c.kind === "condition" ? { field: c.field, op: c.op, value: c.value } : c.kind))
    const fromEmpty = applyProposalByMode("new", createInitialState(), proposal)
    const appended = applyProposalByMode("append", createInitialState(), proposal)
    expect(stripIds(fromEmpty)).toEqual(stripIds(appended))
    expect(stripIds(fromEmpty)).toEqual([{ field: "organism_name", op: "eq", value: "Homo sapiens" }])
  })
})
