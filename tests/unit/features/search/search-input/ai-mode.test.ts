import { describe, expect, test } from "vitest"

import type { AdvancedState } from "~/features/search"
import {
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
