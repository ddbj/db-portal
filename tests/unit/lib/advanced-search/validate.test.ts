import fc from "fast-check"
import { describe, expect, it } from "vitest"

import {
  createConditionNode,
  createGroupNode,
} from "@/lib/advanced-search/tree"
import type {
  AdvancedConditionNode,
  AdvancedGroupNode,
} from "@/lib/advanced-search/types"
import { validateNode } from "@/lib/advanced-search/validate"
import type { AdvancedCondition } from "@/types/search"

const cond = (c: AdvancedCondition): AdvancedConditionNode =>
  createConditionNode(c)

const group = (
  children: AdvancedGroupNode["children"],
  logic: AdvancedGroupNode["logic"] = "AND",
): AdvancedGroupNode => ({
  ...createGroupNode(logic),
  children,
})

describe("validateNode - 有効条件", () => {
  it("Tier 1 + 有効値 + 単一 DB モード → エラーなし", () => {
    const tree = group([
      cond({ field: "title", operator: "equals", value: "cancer" }),
    ])
    expect(validateNode(tree, { db: "bioproject" })).toEqual([])
  })

  it("Tier 1 + 有効値 + 横断モード → エラーなし", () => {
    const tree = group([
      cond({ field: "organism", operator: "equals", value: "Homo sapiens" }),
    ])
    expect(validateNode(tree, "cross")).toEqual([])
  })

  it("Tier 3 + 対応 DB → エラーなし", () => {
    const tree = group([
      cond({
        field: "library_strategy",
        operator: "equals",
        value: "RNA-Seq",
      }),
    ])
    expect(validateNode(tree, { db: "sra" })).toEqual([])
  })
})

describe("validateNode - FIELD_NOT_AVAILABLE_IN_CROSS_DB", () => {
  it("横断モードで Tier 3 フィールド → FIELD_NOT_AVAILABLE_IN_CROSS_DB", () => {
    const tree = group([
      cond({ field: "library_strategy", operator: "equals", value: "WGS" }),
    ])
    const errors = validateNode(tree, "cross")
    expect(errors).toHaveLength(1)
    expect(errors[0]?.code).toBe("FIELD_NOT_AVAILABLE_IN_CROSS_DB")
  })
})

describe("validateNode - INVALID_DATE_FORMAT", () => {
  it.each([
    ["2024-01-01", true],
    ["2024/01/01", false],
    ["20240101", false],
    ["2024-1-1", false],
    ["abc", false],
  ])("date_published equals %s → valid=%s", (value, valid) => {
    const tree = group([
      cond({ field: "date_published", operator: "equals", value }),
    ])
    const errors = validateNode(tree, { db: "bioproject" })
    const hasDateError = errors.some((e) => e.code === "INVALID_DATE_FORMAT")
    expect(hasDateError).toBe(!valid)
  })

  it("between で from/to 両方 ISO 8601 なら OK", () => {
    const tree = group([
      cond({
        field: "date_published",
        operator: "between",
        value: { from: "2020-01-01", to: "2024-12-31" },
      }),
    ])
    expect(validateNode(tree, { db: "bioproject" })).toEqual([])
  })

  it("between で from が無効形式 → INVALID_DATE_FORMAT", () => {
    const tree = group([
      cond({
        field: "date_published",
        operator: "between",
        value: { from: "bad", to: "2024-12-31" },
      }),
    ])
    const errors = validateNode(tree, { db: "bioproject" })
    expect(errors.some((e) => e.code === "INVALID_DATE_FORMAT")).toBe(true)
  })
})

describe("validateNode - MISSING_VALUE", () => {
  it("equals + 空文字 → MISSING_VALUE", () => {
    const tree = group([
      cond({ field: "title", operator: "equals", value: "" }),
    ])
    const errors = validateNode(tree, { db: "bioproject" })
    expect(errors.some((e) => e.code === "MISSING_VALUE")).toBe(true)
  })

  it("between で from/to 両方空 → MISSING_VALUE", () => {
    const tree = group([
      cond({
        field: "date_published",
        operator: "between",
        value: { from: "", to: "" },
      }),
    ])
    const errors = validateNode(tree, { db: "bioproject" })
    expect(errors.some((e) => e.code === "MISSING_VALUE")).toBe(true)
  })
})

describe("validateNode - INVALID_OPERATOR_FOR_FIELD", () => {
  it("identifier に contains → INVALID_OPERATOR_FOR_FIELD", () => {
    const tree = group([
      cond({ field: "identifier", operator: "contains", value: "x" }),
    ])
    const errors = validateNode(tree, { db: "bioproject" })
    expect(errors.some((e) => e.code === "INVALID_OPERATOR_FOR_FIELD")).toBe(true)
  })
})

describe("validateNode - UNKNOWN_FIELD", () => {
  it("存在しないフィールド → UNKNOWN_FIELD", () => {
    const tree = group([
      cond({ field: "__nope__", operator: "equals", value: "x" }),
    ])
    const errors = validateNode(tree, "cross")
    expect(errors.some((e) => e.code === "UNKNOWN_FIELD")).toBe(true)
  })
})

describe("validateNode - NOT_REQUIRES_SINGLE_CHILD", () => {
  it("NOT group に 2 children → NOT_REQUIRES_SINGLE_CHILD", () => {
    const tree = group([
      group(
        [
          cond({ field: "title", operator: "equals", value: "a" }),
          cond({ field: "title", operator: "equals", value: "b" }),
        ],
        "NOT",
      ),
    ])
    const errors = validateNode(tree, { db: "bioproject" })
    expect(errors.some((e) => e.code === "NOT_REQUIRES_SINGLE_CHILD")).toBe(true)
  })

  it("NOT group に 1 child → OK", () => {
    const tree = group([
      group(
        [cond({ field: "title", operator: "equals", value: "a" })],
        "NOT",
      ),
    ])
    expect(validateNode(tree, { db: "bioproject" })).toEqual([])
  })
})

describe("validateNode - NEST_DEPTH_EXCEEDED", () => {
  it("深さ 5 → OK", () => {
    let node: AdvancedGroupNode = group([
      cond({ field: "title", operator: "equals", value: "x" }),
    ])
    for (let i = 0; i < 4; i++) {
      node = group([node])
    }
    const errors = validateNode(node, { db: "bioproject" })
    expect(errors.some((e) => e.code === "NEST_DEPTH_EXCEEDED")).toBe(false)
  })

  it("深さ 6 → NEST_DEPTH_EXCEEDED", () => {
    let node: AdvancedGroupNode = group([
      cond({ field: "title", operator: "equals", value: "x" }),
    ])
    for (let i = 0; i < 5; i++) {
      node = group([node])
    }
    const errors = validateNode(node, { db: "bioproject" })
    expect(errors.some((e) => e.code === "NEST_DEPTH_EXCEEDED")).toBe(true)
  })
})

describe("validateNode - wildcard value", () => {
  it("wildcard に \" を含む → WILDCARD_VALUE_CONTAINS_QUOTE", () => {
    const tree = group([
      cond({ field: "identifier", operator: "wildcard", value: 'a"b*' }),
    ])
    const errors = validateNode(tree, { db: "bioproject" })
    expect(errors.some((e) => e.code === "WILDCARD_VALUE_CONTAINS_QUOTE")).toBe(true)
  })

  it("wildcard に英数 + * のみ → OK", () => {
    const tree = group([
      cond({ field: "identifier", operator: "wildcard", value: "PRJDB*" }),
    ])
    expect(validateNode(tree, { db: "bioproject" })).toEqual([])
  })
})

describe("validateNode - INVALID_NUMBER", () => {
  it("sequence_length (Trad) に 'abc' → INVALID_NUMBER", () => {
    const tree = group([
      cond({ field: "sequence_length", operator: "gte", value: "abc" }),
    ])
    const errors = validateNode(tree, { db: "trad" })
    expect(errors.some((e) => e.code === "INVALID_NUMBER")).toBe(true)
  })

  it("sequence_length に '12345' → OK", () => {
    const tree = group([
      cond({ field: "sequence_length", operator: "gte", value: "12345" }),
    ])
    expect(validateNode(tree, { db: "trad" })).toEqual([])
  })
})

describe("PBT: 任意 tree でも throw しない", () => {
  it("任意の ISO 8601 文字列は valid date として判定", () => {
    fc.assert(
      fc.property(
        fc.date({
          min: new Date("1900-01-01"),
          max: new Date("2100-12-31"),
        }),
        (d) => {
          const iso = d.toISOString().slice(0, 10)
          const tree = group([
            cond({
              field: "date_published",
              operator: "equals",
              value: iso,
            }),
          ])
          expect(validateNode(tree, { db: "bioproject" })).toEqual([])
        },
      ),
    )
  })

  it("任意の非日付文字列 + date フィールド equals → INVALID_DATE_FORMAT", () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 })
          .filter((s) => !/^\d{4}-\d{2}-\d{2}$/.test(s)),
        (value) => {
          const tree = group([
            cond({ field: "date_published", operator: "equals", value }),
          ])
          const errors = validateNode(tree, { db: "bioproject" })
          expect(errors.some((e) => e.code === "INVALID_DATE_FORMAT")).toBe(true)
        },
      ),
    )
  })
})
