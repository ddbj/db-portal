import { describe, expect, it } from "vitest"

import {
  addConditionAt,
  addFreeTextAtRoot,
  addGroupAt,
  collectConditionFieldIds,
  createConditionNode,
  createEmptyRoot,
  createGroupNode,
  createNodeId,
  findRootFreeTextIndex,
  getNodeAt,
  removeAt,
  removeFreeTextAtRoot,
  ROOT_ID,
  setGroupLogicAt,
  updateConditionAt,
  updateFreeTextAtRoot,
  walkTree,
} from "@/lib/advanced-search/tree"
import type {
  AdvancedConditionNode,
  AdvancedGroupNode,
  AdvancedNodeWithId,
} from "@/lib/advanced-search/types"

const expectCondition = (
  node: AdvancedNodeWithId | undefined,
): AdvancedConditionNode => {
  if (node === undefined || node.kind !== "condition") {
    throw new Error("expected condition node")
  }

  return node
}

const expectGroup = (
  node: AdvancedNodeWithId | undefined,
): AdvancedGroupNode => {
  if (node === undefined || node.kind !== "group") {
    throw new Error("expected group node")
  }

  return node
}

describe("createEmptyRoot", () => {
  it("root の id は固定 'root'", () => {
    expect(createEmptyRoot().id).toBe(ROOT_ID)
  })

  it("root は logic=AND の空 group", () => {
    const r = createEmptyRoot()
    expect(r.kind).toBe("group")
    expect(r.logic).toBe("AND")
    expect(r.children).toEqual([])
  })
})

describe("createNodeId", () => {
  it("毎回異なる id を返す (unique)", () => {
    const ids = Array.from({ length: 50 }, () => createNodeId())
    expect(new Set(ids).size).toBe(ids.length)
  })
})

describe("addConditionAt", () => {
  it("root に 1 condition 追加", () => {
    const root = createEmptyRoot()
    const next = addConditionAt(root, [], {
      field: "title",
      operator: "equals",
      value: "cancer",
    })
    expect(next.children).toHaveLength(1)
    expect(next.children[0]?.kind).toBe("condition")
  })

  it("元の root は不変（immutable）", () => {
    const root = createEmptyRoot()
    addConditionAt(root, [], {
      field: "title",
      operator: "equals",
      value: "a",
    })
    expect(root.children).toEqual([])
  })

  it("ネストした group 内に condition 追加", () => {
    let root = createEmptyRoot()
    root = addGroupAt(root, [], "OR")
    root = addConditionAt(root, [0], {
      field: "title",
      operator: "equals",
      value: "cancer",
    })
    const inner = expectGroup(root.children[0])
    expect(inner.children).toHaveLength(1)
  })
})

describe("addGroupAt", () => {
  it("root に新規 group 追加", () => {
    const root = createEmptyRoot()
    const next = addGroupAt(root, [], "OR")
    expect(next.children).toHaveLength(1)
    const child = expectGroup(next.children[0])
    expect(child.logic).toBe("OR")
  })
})

describe("removeAt", () => {
  it("インデックス指定で child 削除", () => {
    let root = createEmptyRoot()
    root = addConditionAt(root, [], { field: "title", operator: "equals", value: "a" })
    root = addConditionAt(root, [], { field: "title", operator: "equals", value: "b" })
    const next = removeAt(root, [0])
    expect(next.children).toHaveLength(1)
    const cond = expectCondition(next.children[0])
    expect(cond.condition.value).toBe("b")
  })

  it("空 path → root 自体は削除できない（no-op）", () => {
    const root = createEmptyRoot()
    expect(removeAt(root, [])).toBe(root)
  })
})

describe("updateConditionAt", () => {
  it("condition 内容を部分更新", () => {
    let root = createEmptyRoot()
    root = addConditionAt(root, [], {
      field: "title",
      operator: "equals",
      value: "cancer",
    })
    const next = updateConditionAt(root, [0], { value: "tumor" })
    const updated = expectCondition(next.children[0])
    expect(updated.condition.value).toBe("tumor")
    expect(updated.condition.field).toBe("title")
    expect(updated.condition.operator).toBe("equals")
  })
})

describe("setGroupLogicAt", () => {
  it("root の logic を AND → OR", () => {
    const root = createEmptyRoot()
    const next = setGroupLogicAt(root, [], "OR")
    expect(next.logic).toBe("OR")
  })
})

describe("getNodeAt", () => {
  it("空 path で root を返す", () => {
    const root = createEmptyRoot()
    expect(getNodeAt(root, [])).toBe(root)
  })

  it("存在しない path で undefined", () => {
    const root = createEmptyRoot()
    expect(getNodeAt(root, [99])).toBeUndefined()
  })
})

describe("walkTree / collectConditionFieldIds", () => {
  it("walkTree は全 node を path 付きで返す", () => {
    let root = createEmptyRoot()
    root = addConditionAt(root, [], { field: "title", operator: "equals", value: "a" })
    root = addGroupAt(root, [], "OR")
    root = addConditionAt(root, [1], {
      field: "organism",
      operator: "equals",
      value: "Homo sapiens",
    })
    const entries = walkTree(root)
    expect(entries.map((e) => e.path)).toEqual([
      [],
      [0],
      [1],
      [1, 0],
    ])
  })

  it("collectConditionFieldIds は condition のみ列挙", () => {
    let root = createEmptyRoot()
    root = addConditionAt(root, [], { field: "title", operator: "equals", value: "a" })
    root = addConditionAt(root, [], {
      field: "library_strategy",
      operator: "equals",
      value: "WGS",
    })
    const ids = collectConditionFieldIds(root)
    expect(ids.map((i) => i.fieldId)).toEqual(["title", "library_strategy"])
  })
})

describe("createGroupNode", () => {
  it("デフォルト AND", () => {
    const g = createGroupNode()
    expect(g.kind).toBe("group")
    expect(g.logic).toBe("AND")
    expect(g.children).toEqual([])
  })

  it("logic 指定で NOT", () => {
    const g = createGroupNode("NOT")
    expect(g.logic).toBe("NOT")
  })
})

describe("createConditionNode", () => {
  it("condition プロパティを保持し id が付与される", () => {
    const n = createConditionNode({
      field: "title",
      operator: "equals",
      value: "cancer",
    })
    expect(n.kind).toBe("condition")
    expect(n.condition.field).toBe("title")
    expect(n.id.length).toBeGreaterThan(0)
  })
})

describe("free_text helpers", () => {
  it("addFreeTextAtRoot は children の先頭に挿入する", () => {
    let root = createEmptyRoot()
    root = addConditionAt(root, [], { field: "title", operator: "equals", value: "a" })
    root = addFreeTextAtRoot(root, "cancer")
    expect(root.children).toHaveLength(2)
    expect(root.children[0]?.kind).toBe("free_text")
  })

  it("addFreeTextAtRoot は 2 個目を追加しない (no-op)", () => {
    let root = createEmptyRoot()
    root = addFreeTextAtRoot(root, "cancer")
    root = addFreeTextAtRoot(root, "tumor")
    const ftCount = root.children.filter((c) => c.kind === "free_text").length
    expect(ftCount).toBe(1)
  })

  it("updateFreeTextAtRoot は value を差し替える", () => {
    let root = createEmptyRoot()
    root = addFreeTextAtRoot(root, "cancer")
    root = updateFreeTextAtRoot(root, "tumor")
    const target = root.children[0]
    if (target === undefined || target.kind !== "free_text") {
      throw new Error("expected free_text node")
    }
    expect(target.value).toBe("tumor")
  })

  it("removeFreeTextAtRoot は free_text を削除する", () => {
    let root = createEmptyRoot()
    root = addFreeTextAtRoot(root, "cancer")
    root = addConditionAt(root, [], { field: "title", operator: "equals", value: "a" })
    root = removeFreeTextAtRoot(root)
    expect(root.children).toHaveLength(1)
    expect(root.children[0]?.kind).toBe("condition")
  })

  it("findRootFreeTextIndex は free_text なしで -1", () => {
    expect(findRootFreeTextIndex(createEmptyRoot())).toBe(-1)
  })
})
