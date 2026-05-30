import { describe, expect, test } from "vitest"

import {
  type AdvancedState,
  applyProposalAst,
  type AssistantProposal,
  assistantProposalToAst,
  createCondition,
  createInitialState,
} from "~/features/search"
import type { ParseNode } from "~/lib/api"

const stateWith = (childCount: number) => {
  const base = createInitialState()

  return {
    root: {
      ...base.root,
      children: Array.from({ length: childCount }, () => createCondition()),
    },
  }
}

describe("assistantProposalToAst", () => {
  test("singleCondition_yieldsBareLeaf", () => {
    const proposal: AssistantProposal = {
      combinator: "AND",
      conditions: [{ field: "organism_name", op: "eq", value: "Homo sapiens" }],
    }
    expect(assistantProposalToAst(proposal)).toEqual({
      op: "eq",
      field: "organism_name",
      value: "Homo sapiens",
    })
  })

  test("andCombinator_yieldsFlatAndOfLeaves", () => {
    const proposal: AssistantProposal = {
      combinator: "AND",
      conditions: [
        { field: "organism_name", op: "eq", value: "Homo sapiens" },
        { field: "title", op: "contains", value: "single cell" },
      ],
    }
    expect(assistantProposalToAst(proposal)).toEqual({
      op: "AND",
      rules: [
        { op: "eq", field: "organism_name", value: "Homo sapiens" },
        { op: "contains", field: "title", value: "single cell" },
      ],
    })
  })

  test("orCombinator_wrapsLeavesInOr", () => {
    const proposal: AssistantProposal = {
      combinator: "OR",
      conditions: [
        { field: "title", op: "contains", value: "cancer" },
        { field: "title", op: "contains", value: "tumor" },
      ],
    }
    const ast = assistantProposalToAst(proposal)
    expect(ast.op).toBe("OR")
  })

  test("betweenCondition_keepsRangeInLeaf", () => {
    const proposal: AssistantProposal = {
      combinator: "AND",
      conditions: [{ field: "date_published", op: "between", from: "2023-01-01", to: "2023-12-31" }],
    }
    expect(assistantProposalToAst(proposal)).toEqual({
      op: "between",
      field: "date_published",
      from: "2023-01-01",
      to: "2023-12-31",
    })
  })
})

describe("applyProposalAst", () => {
  test("singleLeaf_appendsOneCondition", () => {
    const next = applyProposalAst(stateWith(2), {
      op: "eq",
      field: "organism_name",
      value: "Homo sapiens",
    })
    expect(next.root.children).toHaveLength(3)
    const last = next.root.children[2]
    expect(last?.kind === "condition" && last.value).toBe("Homo sapiens")
  })

  test("andGroup_flattensIntoRoot", () => {
    const ast: ParseNode = {
      op: "AND",
      rules: [
        { op: "eq", field: "organism_name", value: "Homo sapiens" },
        { op: "contains", field: "title", value: "single cell" },
      ],
    }
    const next = applyProposalAst(createInitialState(), ast)
    expect(next.root.children).toHaveLength(2)
    expect(next.root.children.every((child) => child.kind === "condition")).toBe(true)
  })

  test("orGroup_staysWrappedInOneGroup", () => {
    const ast: ParseNode = {
      op: "OR",
      rules: [
        { op: "contains", field: "title", value: "cancer" },
        { op: "contains", field: "title", value: "tumor" },
      ],
    }
    const next = applyProposalAst(createInitialState(), ast)
    expect(next.root.children).toHaveLength(1)
    const [group] = next.root.children
    expect(group?.kind).toBe("group")
    expect(group?.kind === "group" && group.innerCombinator).toBe("OR")
  })

  test("negatedLeaf_appendsNegatedCondition", () => {
    const ast: ParseNode = {
      op: "NOT",
      rules: [{ op: "eq", field: "accessibility", value: "controlled-access" }],
    }
    const next = applyProposalAst(createInitialState(), ast)
    const [condition] = next.root.children
    expect(condition?.kind === "condition" && condition.combinator).toBe("NOT")
  })

  test("andGroup_intoOrRoot_staysWrappedSoAndIsNotDemoted", () => {
    // The root's match can be toggled to OR; an AND proposal must keep its AND
    // semantics instead of inheriting the OR root and silently becoming OR.
    const orRoot: AdvancedState = {
      root: {
        ...createInitialState().root,
        innerCombinator: "OR",
        children: [createCondition(), createCondition()],
      },
    }
    const ast: ParseNode = {
      op: "AND",
      rules: [
        { op: "contains", field: "title", value: "x" },
        { op: "eq", field: "organism_name", value: "y" },
      ],
    }
    const next = applyProposalAst(orRoot, ast)
    expect(next.root.children).toHaveLength(3)
    const grafted = next.root.children[2]
    expect(grafted?.kind).toBe("group")
    expect(grafted?.kind === "group" && grafted.innerCombinator).toBe("AND")
  })

  test("freeText_isDroppedOnApply", () => {
    // The keyword lives in its own builder row, so a free-text leaf in a
    // proposal carries nothing the structured builder can hold.
    const next = applyProposalAst(createInitialState(), {
      op: "free_text",
      value: "cancer",
      is_phrase: false,
    })
    expect(next.root.children).toHaveLength(0)
  })
})
