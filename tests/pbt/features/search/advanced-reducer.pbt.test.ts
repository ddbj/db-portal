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

type Op =
  | { kind: "addCondition" }
  | { kind: "addGroup" }
  | { kind: "removeFirst" }
  | { kind: "clear" }

const arbOp: fc.Arbitrary<Op> = fc.oneof(
  fc.constant({ kind: "addCondition" as const }),
  fc.constant({ kind: "addGroup" as const }),
  fc.constant({ kind: "removeFirst" as const }),
  fc.constant({ kind: "clear" as const }),
)

describe("advanced reducer invariants", () => {
  // 4 op を混ぜて 20 手まで走らせる。 add-only の 2 op / 40 run では ID 衝突が
  // 露見する条件 (remove / clear の後に add) に触れなかったため、 domain を
  // 広げつつ numRuns も上げる。
  test.prop([fc.array(arbOp, { minLength: 1, maxLength: 20 })], { numRuns: 200 })(
    "advancedReducer_ids_areAllUnique",
    (ops) => {
      let state = createInitialState()
      for (const op of ops) {
        if (op.kind === "addCondition") {
          state = advancedReducer(state, { type: "addCondition", parentId: state.root.id })
        } else if (op.kind === "addGroup") {
          state = advancedReducer(state, { type: "addGroup", parentId: state.root.id })
        } else if (op.kind === "removeFirst") {
          const firstChild = state.root.children[0]
          if (firstChild) state = advancedReducer(state, { type: "removeNode", id: firstChild.id })
        } else {
          state = advancedReducer(state, { type: "clear" })
        }
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
