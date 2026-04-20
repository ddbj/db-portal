import { describe, expect, it } from "vitest"

import {
  advancedSearchReducer,
  buildInitialState,
} from "@/lib/advanced-search/reducer"
import { createConditionNode } from "@/lib/advanced-search/tree"
import type {
  AdvancedGroupNode,
  AdvancedNodeWithId,
  AdvancedSearchState,
} from "@/lib/advanced-search/types"
import { ALL_DB_VALUE } from "@/lib/search-url"

const initial = (): AdvancedSearchState => buildInitialState(ALL_DB_VALUE, null)

const expectCondition = (node: AdvancedNodeWithId | undefined) => {
  if (node === undefined || node.kind !== "condition") {
    throw new Error("expected condition node")
  }

  return node
}

describe("buildInitialState", () => {
  it("ALL_DB_VALUE で cross モード", () => {
    const s = buildInitialState(ALL_DB_VALUE, null)
    expect(s.mode).toBe("cross")
    expect(s.db).toBe(ALL_DB_VALUE)
    expect(s.tree.children).toEqual([])
    expect(s.pendingDb).toBeNull()
  })

  it("DB id で single モード", () => {
    const s = buildInitialState("bioproject", null)
    expect(s.mode).toBe("single")
    expect(s.db).toBe("bioproject")
  })

  it("initialAdv を保持", () => {
    const s = buildInitialState(ALL_DB_VALUE, "title:cancer")
    expect(s.initialAdv).toBe("title:cancer")
  })
})

describe("ADD_CONDITION", () => {
  it("デフォルトで title field を追加", () => {
    const state = initial()
    const next = advancedSearchReducer(state, { type: "ADD_CONDITION", path: [] })
    expect(next.tree.children).toHaveLength(1)
    const child = expectCondition(next.tree.children[0])
    expect(child.condition.field).toBe("title")
    expect(child.condition.operator).toBe("contains")
  })

  it("fieldId 指定で特定のフィールドを追加", () => {
    const state = initial()
    const next = advancedSearchReducer(state, {
      type: "ADD_CONDITION",
      path: [],
      fieldId: "organism",
    })
    const child = expectCondition(next.tree.children[0])
    expect(child.condition.field).toBe("organism")
  })
})

describe("ADD_GROUP", () => {
  it("root に group を追加", () => {
    const state = initial()
    const next = advancedSearchReducer(state, { type: "ADD_GROUP", path: [] })
    expect(next.tree.children).toHaveLength(1)
    expect(next.tree.children[0]?.kind).toBe("group")
  })
})

describe("REMOVE_NODE", () => {
  it("指定 path の child を削除", () => {
    const state = initial()
    const s1 = advancedSearchReducer(state, { type: "ADD_CONDITION", path: [] })
    const s2 = advancedSearchReducer(s1, { type: "ADD_CONDITION", path: [] })
    expect(s2.tree.children).toHaveLength(2)
    const s3 = advancedSearchReducer(s2, { type: "REMOVE_NODE", path: [0] })
    expect(s3.tree.children).toHaveLength(1)
  })
})

describe("UPDATE_CONDITION", () => {
  it("value のみ更新", () => {
    const state = initial()
    const s1 = advancedSearchReducer(state, { type: "ADD_CONDITION", path: [] })
    const s2 = advancedSearchReducer(s1, {
      type: "UPDATE_CONDITION",
      path: [0],
      patch: { value: "cancer" },
    })
    const child = expectCondition(s2.tree.children[0])
    expect(child.condition.value).toBe("cancer")
  })

  it("equals → between で value が {from,to} に reset", () => {
    const state = initial()
    const s1 = advancedSearchReducer(state, {
      type: "ADD_CONDITION",
      path: [],
      fieldId: "date_published",
    })
    const s2 = advancedSearchReducer(s1, {
      type: "UPDATE_CONDITION",
      path: [0],
      patch: { operator: "equals", value: "2024-01-01" },
    })
    const s3 = advancedSearchReducer(s2, {
      type: "UPDATE_CONDITION",
      path: [0],
      patch: { operator: "between" },
    })
    const child = expectCondition(s3.tree.children[0])
    expect(child.condition.value).toEqual({ from: "", to: "" })
  })

  it("field 変更で value が reset される", () => {
    let state = initial()
    state = advancedSearchReducer(state, { type: "ADD_CONDITION", path: [], fieldId: "title" })
    state = advancedSearchReducer(state, {
      type: "UPDATE_CONDITION",
      path: [0],
      patch: { value: "cancer" },
    })
    state = advancedSearchReducer(state, {
      type: "UPDATE_CONDITION",
      path: [0],
      patch: { field: "date_published" },
    })
    const child = expectCondition(state.tree.children[0])
    expect(child.condition.field).toBe("date_published")
    const v = child.condition.value
    const normalized = typeof v === "string"
      ? v
      : (v as { from: string; to: string })
    expect(typeof normalized === "string" ? normalized : normalized.from)
      .toBe("")
  })

  it("field 変更で operator が新 field の availableOps[0] にフォールバック", () => {
    const state = initial()
    const s1 = advancedSearchReducer(state, { type: "ADD_CONDITION", path: [], fieldId: "identifier" })
    const s1Child = expectCondition(s1.tree.children[0])
    expect(s1Child.condition.operator).toBe("equals")

    const s2 = advancedSearchReducer(s1, {
      type: "UPDATE_CONDITION",
      path: [0],
      patch: { field: "date_published" },
    })
    const s2Child = expectCondition(s2.tree.children[0])
    expect(s2Child.condition.field).toBe("date_published")
    expect(["between", "equals"]).toContain(s2Child.condition.operator)
  })
})

describe("CHANGE_DB_REQUEST / CONFIRM / CANCEL", () => {
  it("Tier 3 条件がないまま DB 切替 → pendingDb=null, 即切替", () => {
    let state = initial()
    state = advancedSearchReducer(state, { type: "ADD_CONDITION", path: [], fieldId: "title" })
    const next = advancedSearchReducer(state, {
      type: "CHANGE_DB_REQUEST",
      next: "bioproject",
    })
    expect(next.pendingDb).toBeNull()
    expect(next.db).toBe("bioproject")
    expect(next.mode).toBe("single")
  })

  it("Tier 3 条件ありで別 DB に切替 → pendingDb 設定、切替保留", () => {
    let state = buildInitialState("sra", null)
    state = advancedSearchReducer(state, {
      type: "ADD_CONDITION",
      path: [],
      fieldId: "library_strategy",
    })
    const next = advancedSearchReducer(state, {
      type: "CHANGE_DB_REQUEST",
      next: "bioproject",
    })
    expect(next.pendingDb).not.toBeNull()
    expect(next.db).toBe("sra")
    expect(next.pendingDb?.next).toBe("bioproject")
    expect(next.pendingDb?.toRemoveIds).toHaveLength(1)
  })

  it("CONFIRM_DB_CHANGE で Tier 3 条件を削除して切替完了", () => {
    let state = buildInitialState("sra", null)
    state = advancedSearchReducer(state, {
      type: "ADD_CONDITION",
      path: [],
      fieldId: "library_strategy",
    })
    state = advancedSearchReducer(state, {
      type: "ADD_CONDITION",
      path: [],
      fieldId: "title",
    })
    state = advancedSearchReducer(state, {
      type: "CHANGE_DB_REQUEST",
      next: "bioproject",
    })
    const final = advancedSearchReducer(state, { type: "CONFIRM_DB_CHANGE" })
    expect(final.pendingDb).toBeNull()
    expect(final.db).toBe("bioproject")
    expect(final.tree.children).toHaveLength(1)
    const child = expectCondition(final.tree.children[0])
    expect(child.condition.field).toBe("title")
  })

  it("CANCEL_DB_CHANGE で pendingDb クリア、DB 維持", () => {
    let state = buildInitialState("sra", null)
    state = advancedSearchReducer(state, {
      type: "ADD_CONDITION",
      path: [],
      fieldId: "library_strategy",
    })
    state = advancedSearchReducer(state, {
      type: "CHANGE_DB_REQUEST",
      next: "bioproject",
    })
    const final = advancedSearchReducer(state, { type: "CANCEL_DB_CHANGE" })
    expect(final.pendingDb).toBeNull()
    expect(final.db).toBe("sra")
    expect(final.tree.children).toHaveLength(1)
  })

  it("Trad 切替で date_modified / date_created / date が date_published に寄る", () => {
    let state = initial()
    state = advancedSearchReducer(state, { type: "ADD_CONDITION", path: [], fieldId: "date_modified" })
    state = advancedSearchReducer(state, { type: "ADD_CONDITION", path: [], fieldId: "date" })
    state = advancedSearchReducer(state, { type: "ADD_CONDITION", path: [], fieldId: "date_published" })
    const next = advancedSearchReducer(state, { type: "CHANGE_DB_REQUEST", next: "trad" })
    expect(next.db).toBe("trad")
    const fields = next.tree.children
      .filter((c): c is Extract<typeof c, { kind: "condition" }> =>
        c.kind === "condition",
      )
      .map((c) => c.condition.field)
    expect(fields.every((f) => f === "date_published")).toBe(true)
  })

  it("同じ DB への切替は no-op", () => {
    const state = buildInitialState("sra", null)
    const next = advancedSearchReducer(state, { type: "CHANGE_DB_REQUEST", next: "sra" })
    expect(next).toBe(state)
  })
})

describe("APPLY_EXAMPLE / RESET / SET_GROUP_LOGIC", () => {
  it("APPLY_EXAMPLE で state が丸ごと置換される", () => {
    const state = initial()
    const exampleTree: AdvancedGroupNode = {
      id: "root",
      kind: "group",
      logic: "AND",
      children: [
        createConditionNode({ field: "title", operator: "equals", value: "cancer" }),
      ],
    }
    const next = advancedSearchReducer(state, {
      type: "APPLY_EXAMPLE",
      example: {
        id: "x",
        labelKey: "k",
        db: "bioproject",
        tree: exampleTree,
      },
    })
    expect(next.db).toBe("bioproject")
    expect(next.mode).toBe("single")
    expect(next.tree).toBe(exampleTree)
  })

  it("RESET で tree が空に戻る", () => {
    let state = initial()
    state = advancedSearchReducer(state, { type: "ADD_CONDITION", path: [] })
    state = advancedSearchReducer(state, { type: "ADD_CONDITION", path: [] })
    const next = advancedSearchReducer(state, { type: "RESET" })
    expect(next.tree.children).toEqual([])
  })

  it("SET_GROUP_LOGIC で root の logic を変更", () => {
    const state = initial()
    const next = advancedSearchReducer(state, {
      type: "SET_GROUP_LOGIC",
      path: [],
      logic: "OR",
    })
    expect(next.tree.logic).toBe("OR")
  })
})
