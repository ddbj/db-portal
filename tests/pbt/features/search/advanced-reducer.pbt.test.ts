import { fc, test } from "@fast-check/vitest"
import { describe, expect } from "vitest"

import {
  type AdvancedNode,
  type AdvancedNodeId,
  advancedReducer,
  createInitialState,
} from "~/features/search"

const collectIds = (node: AdvancedNode, into: Set<AdvancedNodeId>): void => {
  into.add(node.id)
  if (node.kind === "group") {
    for (const child of node.children) collectIds(child, into)
  }
}

describe("advanced reducer invariants", () => {
  test.prop([fc.array(fc.constantFrom("addCondition", "addGroup"), { minLength: 1, maxLength: 8 })], {
    numRuns: 40,
  })(
    "advancedReducer_ids_areAllUnique",
    (ops) => {
      let state = createInitialState()
      for (const op of ops) {
        state = advancedReducer(state, { type: op, parentId: state.root.id })
      }
      const seen = new Set<AdvancedNodeId>()
      collectIds(state.root, seen)
      const flat: AdvancedNodeId[] = []
      const flatten = (node: AdvancedNode): void => {
        flat.push(node.id)
        if (node.kind === "group") node.children.forEach(flatten)
      }
      flatten(state.root)
      expect(flat.length).toBe(seen.size)
    },
  )

  test.prop([fc.integer({ min: 1, max: 6 })])(
    "advancedReducer_clear_resetsToEmpty",
    (count) => {
      let state = createInitialState()
      for (let i = 0; i < count; i += 1) {
        state = advancedReducer(state, { type: "addCondition", parentId: state.root.id })
      }
      const cleared = advancedReducer(state, { type: "clear" })
      expect(cleared.root.children.length).toBe(0)
    },
  )

  test("advancedReducer_removeRoot_isNoop", () => {
    const initial = createInitialState()
    const next = advancedReducer(initial, { type: "removeNode", id: initial.root.id })
    expect(next).toBe(initial)
  })

  test("advancedReducer_addCondition_seedsNonNegatedAnd", () => {
    const initial = createInitialState()
    const orInner = advancedReducer(initial, {
      type: "updateInnerCombinator",
      id: initial.root.id,
      innerCombinator: "OR",
    })
    const added = advancedReducer(orInner, { type: "addCondition", parentId: orInner.root.id })
    const lastChild = added.root.children[added.root.children.length - 1]
    // New conditions are non-negated (combinator AND); AND/OR joining is in
    // innerCombinator, so the group's OR does not leak onto the child.
    expect(lastChild?.combinator).toBe("AND")
  })
})
