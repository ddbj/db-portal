import { describe, expect, it } from "vitest"

import {
  createConditionNode,
  createFreeTextNode,
  createGroupNode,
} from "@/lib/advanced-search/tree"
import type { AdvancedGroupNode } from "@/lib/advanced-search/types"
import { advancedTreeToAst } from "@/lib/search-ast/from-advanced"
import { astToDsl } from "@/lib/search-ast/to-dsl"
import { isBoolOp, isFieldClause, isFreeText } from "@/lib/search-ast/types"

const root = (children: AdvancedGroupNode["children"]): AdvancedGroupNode => ({
  id: "root",
  kind: "group",
  logic: "AND",
  children,
})

describe("advancedTreeToAst - operator normalization", () => {
  it("equals → eq", () => {
    const ast = advancedTreeToAst(root([
      createConditionNode({ field: "title", operator: "equals", value: "cancer" }),
    ]))
    expect(astToDsl(ast)).toBe("title:cancer")
  })

  it("contains → contains", () => {
    const ast = advancedTreeToAst(root([
      createConditionNode({ field: "title", operator: "contains", value: "cancer" }),
    ]))
    expect(astToDsl(ast)).toBe("title:cancer")
  })

  it("wildcard → wildcard (value preserved)", () => {
    const ast = advancedTreeToAst(root([
      createConditionNode({ field: "identifier", operator: "wildcard", value: "PRJ*" }),
    ]))
    expect(astToDsl(ast)).toBe("identifier:PRJ*")
  })

  it("starts_with → wildcard with appended *", () => {
    const ast = advancedTreeToAst(root([
      createConditionNode({ field: "identifier", operator: "starts_with", value: "PRJ" }),
    ]))
    expect(astToDsl(ast)).toBe("identifier:PRJ*")
  })

  it("not_equals → BoolOp(NOT, [eq])", () => {
    const ast = advancedTreeToAst(root([
      createConditionNode({
        field: "library_strategy",
        operator: "not_equals",
        value: "WGS",
      }),
    ]))
    expect(astToDsl(ast)).toBe("NOT library_strategy:WGS")
  })

  it("between (date) → range with from/to", () => {
    const ast = advancedTreeToAst(root([
      createConditionNode({
        field: "date_published",
        operator: "between",
        value: { from: "2020-01-01", to: "2024-12-31" },
      }),
    ]))
    expect(astToDsl(ast)).toBe("date_published:[2020-01-01 TO 2024-12-31]")
  })

  it("gte → range with to='*'", () => {
    const ast = advancedTreeToAst(root([
      createConditionNode({
        field: "date_published",
        operator: "gte",
        value: "2020-01-01",
      }),
    ]))
    expect(astToDsl(ast)).toBe("date_published:[2020-01-01 TO *]")
  })

  it("lte → range with from='*'", () => {
    const ast = advancedTreeToAst(root([
      createConditionNode({
        field: "date_published",
        operator: "lte",
        value: "2024-12-31",
      }),
    ]))
    expect(astToDsl(ast)).toBe("date_published:[* TO 2024-12-31]")
  })
})

describe("advancedTreeToAst - tree shape", () => {
  it("empty tree → null", () => {
    expect(advancedTreeToAst(root([]))).toBeNull()
  })

  it("singleton condition → unwrapped (no AND wrapping)", () => {
    const ast = advancedTreeToAst(root([
      createConditionNode({ field: "title", operator: "equals", value: "cancer" }),
    ]))
    expect(isFieldClause(ast!)).toBe(true)
  })

  it("two conditions in AND group → BoolOp AND", () => {
    const ast = advancedTreeToAst(root([
      createConditionNode({ field: "title", operator: "equals", value: "cancer" }),
      createConditionNode({ field: "organism", operator: "equals", value: "Homo sapiens" }),
    ]))
    expect(isBoolOp(ast!)).toBe(true)
  })

  it("OR group → BoolOp OR", () => {
    const orGroup = createGroupNode("OR")
    orGroup.children.push(
      createConditionNode({ field: "title", operator: "equals", value: "cancer" }),
      createConditionNode({ field: "title", operator: "equals", value: "tumor" }),
    )
    const ast = advancedTreeToAst(root([orGroup]))
    expect(astToDsl(ast)).toBe("title:cancer OR title:tumor")
  })

  it("NOT group with single child → BoolOp NOT", () => {
    const notGroup = createGroupNode("NOT")
    notGroup.children.push(
      createConditionNode({ field: "title", operator: "equals", value: "tumor" }),
    )
    const ast = advancedTreeToAst(root([notGroup]))
    expect(astToDsl(ast)).toBe("NOT title:tumor")
  })

  it("conditions with empty value are pruned", () => {
    const ast = advancedTreeToAst(root([
      createConditionNode({ field: "title", operator: "equals", value: "" }),
      createConditionNode({ field: "organism", operator: "equals", value: "Homo sapiens" }),
    ]))
    expect(astToDsl(ast)).toBe('organism:"Homo sapiens"')
  })

  it("nested group: AND[ FieldClause, OR[FieldClause, FieldClause] ]", () => {
    const orGroup = createGroupNode("OR")
    orGroup.children.push(
      createConditionNode({ field: "title", operator: "equals", value: "cancer" }),
      createConditionNode({ field: "title", operator: "equals", value: "tumor" }),
    )
    const ast = advancedTreeToAst(root([
      createConditionNode({ field: "organism", operator: "equals", value: "Homo sapiens" }),
      orGroup,
    ]))
    expect(astToDsl(ast)).toBe(
      'organism:"Homo sapiens" AND (title:cancer OR title:tumor)',
    )
  })
})

describe("advancedTreeToAst - free_text", () => {
  it("free_text 単独 → FreeText ノード", () => {
    const ast = advancedTreeToAst(root([createFreeTextNode("cancer")]))
    expect(ast).not.toBeNull()
    expect(isFreeText(ast!)).toBe(true)
    expect(astToDsl(ast)).toBe('"cancer"')
  })

  it("空 value の free_text は無視される", () => {
    const ast = advancedTreeToAst(root([
      createFreeTextNode("   "),
      createConditionNode({ field: "title", operator: "equals", value: "cancer" }),
    ]))
    expect(astToDsl(ast)).toBe("title:cancer")
  })

  it("free_text + condition → AND with free_text first", () => {
    const ast = advancedTreeToAst(root([
      createConditionNode({ field: "organism", operator: "equals", value: "Homo sapiens" }),
      createFreeTextNode("cancer"),
    ]))
    expect(astToDsl(ast)).toBe('"cancer" AND organism:"Homo sapiens"')
  })
})
