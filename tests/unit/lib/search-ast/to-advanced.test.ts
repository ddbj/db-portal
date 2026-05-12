import { describe, expect, it } from "vitest"

import type {
  AdvancedConditionNode,
  AdvancedFreeTextNode,
  AdvancedGroupNode,
} from "@/lib/advanced-search/types"
import {
  boolAnd,
  boolNot,
  boolOr,
  fieldBetween,
  fieldEq,
  fieldWildcard,
  freeText,
} from "@/lib/search-ast/factory"
import { searchAstToAdvancedTree } from "@/lib/search-ast/to-advanced"

const expectCondition = (
  node: AdvancedGroupNode["children"][number] | undefined,
): AdvancedConditionNode => {
  if (node === undefined || node.kind !== "condition") {
    throw new Error("expected condition node")
  }

  return node
}

const expectFreeText = (
  node: AdvancedGroupNode["children"][number] | undefined,
): AdvancedFreeTextNode => {
  if (node === undefined || node.kind !== "free_text") {
    throw new Error("expected free_text node")
  }

  return node
}

describe("searchAstToAdvancedTree - leaf reverse-mapping", () => {
  it("eq → equals condition", () => {
    const tree = searchAstToAdvancedTree(
      fieldEq("title", "cancer"),
      "bioproject",
    )
    expect(tree.children).toHaveLength(1)
    const child = expectCondition(tree.children[0])
    expect(child.condition.field).toBe("title")
    expect(child.condition.operator).toBe("equals")
    expect(child.condition.value).toBe("cancer")
  })

  it("wildcard with trailing * only → starts_with", () => {
    const tree = searchAstToAdvancedTree(
      fieldWildcard("identifier", "PRJ*"),
      "bioproject",
    )
    const child = expectCondition(tree.children[0])
    expect(child.condition.operator).toBe("starts_with")
    expect(child.condition.value).toBe("PRJ")
  })

  it("wildcard with infix * → wildcard (no rewrite)", () => {
    const tree = searchAstToAdvancedTree(
      fieldWildcard("identifier", "PR*1"),
      "bioproject",
    )
    const child = expectCondition(tree.children[0])
    expect(child.condition.operator).toBe("wildcard")
    expect(child.condition.value).toBe("PR*1")
  })

  it("between with both ends → between", () => {
    const tree = searchAstToAdvancedTree(
      fieldBetween("date_published", "2020-01-01", "2024-12-31"),
      "bioproject",
    )
    const child = expectCondition(tree.children[0])
    expect(child.condition.operator).toBe("between")
    expect(child.condition.value).toEqual({ from: "2020-01-01", to: "2024-12-31" })
  })

  it("between with to='*' → gte", () => {
    const tree = searchAstToAdvancedTree(
      fieldBetween("date_published", "2020-01-01", "*"),
      "bioproject",
    )
    const child = expectCondition(tree.children[0])
    expect(child.condition.operator).toBe("gte")
    expect(child.condition.value).toBe("2020-01-01")
  })

  it("between with from='*' → lte", () => {
    const tree = searchAstToAdvancedTree(
      fieldBetween("date_published", "*", "2024-12-31"),
      "bioproject",
    )
    const child = expectCondition(tree.children[0])
    expect(child.condition.operator).toBe("lte")
    expect(child.condition.value).toBe("2024-12-31")
  })

  it("BoolOp(NOT, [FieldClause(eq)]) → not_equals condition", () => {
    const tree = searchAstToAdvancedTree(
      boolNot(fieldEq("library_strategy", "WGS")),
      "sra",
    )
    const child = expectCondition(tree.children[0])
    expect(child.condition.operator).toBe("not_equals")
    expect(child.condition.value).toBe("WGS")
  })
})

describe("searchAstToAdvancedTree - tree shape", () => {
  it("AND of two leaves → root group with two condition children", () => {
    const tree = searchAstToAdvancedTree(
      boolAnd([
        fieldEq("title", "cancer"),
        fieldEq("organism", "Homo sapiens"),
      ]),
      "bioproject",
    )
    expect(tree.id).toBe("root")
    expect(tree.children).toHaveLength(2)
  })

  it("OR group nested in AND → AND root with OR child", () => {
    const tree = searchAstToAdvancedTree(
      boolAnd([
        fieldEq("organism", "Homo sapiens"),
        boolOr([
          fieldEq("title", "cancer"),
          fieldEq("title", "tumor"),
        ]),
      ]),
      "bioproject",
    )
    expect(tree.children).toHaveLength(2)
    const second = tree.children[1]
    if (second === undefined || second.kind !== "group") {
      throw new Error("expected OR group as second child")
    }
    expect(second.logic).toBe("OR")
    expect(second.children).toHaveLength(2)
  })

  it("FreeText at root of AND → restored as AdvancedFreeTextNode", () => {
    const tree = searchAstToAdvancedTree(
      boolAnd([
        freeText("cancer"),
        fieldEq("organism", "Homo sapiens"),
      ]),
      "bioproject",
    )
    expect(tree.children).toHaveLength(2)
    const ft = expectFreeText(tree.children[0])
    expect(ft.value).toBe("cancer")
    const cond = expectCondition(tree.children[1])
    expect(cond.condition.field).toBe("organism")
  })

  it("FreeText alone at root → wrapped in AND group with single free_text child", () => {
    const tree = searchAstToAdvancedTree(freeText("cancer"), "bioproject")
    expect(tree.logic).toBe("AND")
    expect(tree.children).toHaveLength(1)
    const ft = expectFreeText(tree.children[0])
    expect(ft.value).toBe("cancer")
  })

  it("FreeText nested deeper than root AND is dropped", () => {
    const tree = searchAstToAdvancedTree(
      boolAnd([
        boolOr([freeText("cancer"), fieldEq("title", "tumor")]),
      ]),
      "bioproject",
    )
    const orGroup = tree.children[0]
    if (orGroup === undefined || orGroup.kind !== "group") {
      throw new Error("expected OR group child")
    }
    expect(orGroup.children.every((c) => c.kind !== "free_text")).toBe(true)
  })

  it("unknown field → dropped (resolveFieldId returns null)", () => {
    const tree = searchAstToAdvancedTree(
      boolAnd([
        fieldEq("organism", "Homo sapiens"),
        fieldEq("nonexistent_field", "x"),
      ]),
      "bioproject",
    )
    expect(tree.children).toHaveLength(1)
  })
})
