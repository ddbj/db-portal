import { describe, expect, test } from "vitest"

import { type AdvancedCondition, type AdvancedGroup, type AdvancedNode, advancedReducer, createInitialState } from "~/features/search"

const expectCondition = (node: AdvancedNode | undefined): AdvancedCondition => {
  if (!node || node.kind !== "condition") throw new Error("expected condition")

  return node
}

const expectGroup = (node: AdvancedNode | undefined): AdvancedGroup => {
  if (!node || node.kind !== "group") throw new Error("expected group")

  return node
}

describe("advancedReducer", () => {
  test("addCondition_inheritsInnerCombinator", () => {
    const initial = createInitialState()
    const next = advancedReducer(initial, { type: "addCondition", parentId: initial.root.id })
    expect(next.root.children.length).toBe(1)
    expect(expectCondition(next.root.children[0]).combinator).toBe("AND")
  })

  test("updateField_dateField_switchesOpToBetween", () => {
    const initial = createInitialState()
    const withCondition = advancedReducer(initial, { type: "addCondition", parentId: initial.root.id })
    const child = expectCondition(withCondition.root.children[0])
    const updated = advancedReducer(withCondition, { type: "updateField", id: child.id, field: "date_published" })
    const after = expectCondition(updated.root.children[0])
    expect(after.field).toBe("date_published")
    expect(after.op).toBe("between")
  })

  test("addGroup_seedsConditionInside", () => {
    const initial = createInitialState()
    const next = advancedReducer(initial, { type: "addGroup", parentId: initial.root.id })
    expect(next.root.children.length).toBe(1)
    const group = expectGroup(next.root.children[0])
    expect(group.children.length).toBe(1)
    expect(group.children[0]?.kind).toBe("condition")
  })

  test("removeNode_removesChild", () => {
    const initial = createInitialState()
    const withCondition = advancedReducer(initial, { type: "addCondition", parentId: initial.root.id })
    const child = expectCondition(withCondition.root.children[0])
    const removed = advancedReducer(withCondition, { type: "removeNode", id: child.id })
    expect(removed.root.children.length).toBe(0)
  })

  test("clear_resetsState", () => {
    const initial = createInitialState()
    const populated = advancedReducer(initial, { type: "addCondition", parentId: initial.root.id })
    const cleared = advancedReducer(populated, { type: "clear" })
    expect(cleared.root.children.length).toBe(0)
  })
})
