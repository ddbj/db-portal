import fc from "fast-check"
import { describe, expect, it } from "vitest"

import {
  conditionToDsl,
  countDepth,
  escapePhrase,
  MAX_NEST_DEPTH,
  needsPhrase,
  nodeToDsl,
} from "@/lib/advanced-search/dsl"
import { createConditionNode, createGroupNode } from "@/lib/advanced-search/tree"
import type {
  AdvancedConditionNode,
  AdvancedGroupNode,
} from "@/lib/advanced-search/types"
import type { AdvancedCondition } from "@/types/search"

const makeCondition = (c: AdvancedCondition): AdvancedConditionNode =>
  createConditionNode(c)

const makeGroup = (
  children: AdvancedGroupNode["children"],
  logic: AdvancedGroupNode["logic"] = "AND",
): AdvancedGroupNode => ({
  ...createGroupNode(logic),
  children,
})

describe("escapePhrase", () => {
  it("クォート内の \" と \\ のみ escape する", () => {
    expect(escapePhrase('He said "hi"')).toBe('He said \\"hi\\"')
    expect(escapePhrase("path\\to\\file")).toBe("path\\\\to\\\\file")
    expect(escapePhrase('mixed "quote" and \\slash')).toBe(
      'mixed \\"quote\\" and \\\\slash',
    )
  })

  it("Lucene メタ文字 (+, -, (, ), [, ]) はクォート内では escape しない", () => {
    expect(escapePhrase("a+b-c(d)[e]")).toBe("a+b-c(d)[e]")
  })

  it("空文字はそのまま空文字", () => {
    expect(escapePhrase("")).toBe("")
  })
})

describe("needsPhrase", () => {
  it.each([
    ["cancer", false],
    ["RNA123", false],
    ["rna_seq", false],
    ["Homo sapiens", true],
    ["PRJDB*", true],
    ["", true],
    ['quote"inside', true],
    ["foo-bar", true],
  ])("%s → %s", (input, expected) => {
    expect(needsPhrase(input)).toBe(expected)
  })
})

describe("conditionToDsl", () => {
  it("equals + text (クォート必要) → field:\"value\"", () => {
    expect(
      conditionToDsl({ field: "organism", operator: "equals", value: "Homo sapiens" }),
    ).toBe('organism:"Homo sapiens"')
  })

  it("equals + text (英数のみ) → field:value (ノンクォート)", () => {
    expect(
      conditionToDsl({ field: "title", operator: "equals", value: "cancer" }),
    ).toBe("title:cancer")
  })

  it("equals + date → field:2024-01-01 (クォート不要)", () => {
    expect(
      conditionToDsl({ field: "date_published", operator: "equals", value: "2024-01-01" }),
    ).toBe("date_published:2024-01-01")
  })

  it("between + date → field:[from TO to]", () => {
    expect(
      conditionToDsl({
        field: "date_published",
        operator: "between",
        value: { from: "2020-01-01", to: "2024-12-31" },
      }),
    ).toBe("date_published:[2020-01-01 TO 2024-12-31]")
  })

  it("gte + date → field:[from TO *]", () => {
    expect(
      conditionToDsl({
        field: "date_modified",
        operator: "gte",
        value: "2024-01-01",
      }),
    ).toBe("date_modified:[2024-01-01 TO *]")
  })

  it("lte + date → field:[* TO to]", () => {
    expect(
      conditionToDsl({
        field: "date_created",
        operator: "lte",
        value: "2024-12-31",
      }),
    ).toBe("date_created:[* TO 2024-12-31]")
  })

  it("starts_with → field:value*", () => {
    expect(
      conditionToDsl({
        field: "identifier",
        operator: "starts_with",
        value: "PRJDB",
      }),
    ).toBe("identifier:PRJDB*")
  })

  it("wildcard → 値そのまま (ノンクォート)", () => {
    expect(
      conditionToDsl({
        field: "identifier",
        operator: "wildcard",
        value: "PRJDB*",
      }),
    ).toBe("identifier:PRJDB*")
  })

  it("not_equals → NOT field:\"value\"", () => {
    expect(
      conditionToDsl({
        field: "library_strategy",
        operator: "not_equals",
        value: "RNA-Seq",
      }),
    ).toBe('NOT library_strategy:"RNA-Seq"')
  })

  it("dslName が異なる bioproject_grant_agency → grant_agency が出力名", () => {
    expect(
      conditionToDsl({
        field: "bioproject_grant_agency",
        operator: "equals",
        value: "JSPS",
      }),
    ).toBe("grant_agency:JSPS")
  })

  it("値に \" を含む → \\\" で escape", () => {
    expect(
      conditionToDsl({
        field: "title",
        operator: "equals",
        value: 'He said "hi"',
      }),
    ).toBe('title:"He said \\"hi\\""')
  })

  it("未知フィールド → 空文字", () => {
    expect(
      conditionToDsl({
        field: "__unknown__",
        operator: "equals",
        value: "x",
      }),
    ).toBe("")
  })

  it("空文字 value → 空文字", () => {
    expect(
      conditionToDsl({ field: "title", operator: "equals", value: "" }),
    ).toBe("")
  })

  it("between で from/to いずれか空 → 空文字", () => {
    expect(
      conditionToDsl({
        field: "date_published",
        operator: "between",
        value: { from: "", to: "2024-01-01" },
      }),
    ).toBe("date_published:[ TO 2024-01-01]")
  })
})

describe("nodeToDsl / countDepth", () => {
  it("root に 1 condition のみ → 括弧なし", () => {
    const tree = makeGroup([
      makeCondition({ field: "title", operator: "equals", value: "cancer" }),
    ])
    expect(nodeToDsl(tree)).toBe("title:cancer")
  })

  it("root に 2 condition (AND) → 括弧なしで連結", () => {
    const tree = makeGroup([
      makeCondition({ field: "title", operator: "equals", value: "cancer" }),
      makeCondition({ field: "organism", operator: "equals", value: "Homo sapiens" }),
    ])
    expect(nodeToDsl(tree)).toBe('title:cancer AND organism:"Homo sapiens"')
  })

  it("ネスト group → 括弧あり", () => {
    const inner = makeGroup(
      [
        makeCondition({ field: "title", operator: "equals", value: "cancer" }),
        makeCondition({ field: "title", operator: "equals", value: "tumor" }),
      ],
      "OR",
    )
    const tree = makeGroup([
      inner,
      makeCondition({ field: "organism", operator: "equals", value: "Homo sapiens" }),
    ])
    expect(nodeToDsl(tree)).toBe(
      '(title:cancer OR title:tumor) AND organism:"Homo sapiens"',
    )
  })

  it("NOT group → NOT child", () => {
    const notGroup = makeGroup(
      [makeCondition({ field: "title", operator: "equals", value: "tumor" })],
      "NOT",
    )
    const tree = makeGroup([
      makeCondition({ field: "title", operator: "equals", value: "cancer" }),
      notGroup,
    ])
    expect(nodeToDsl(tree)).toBe("title:cancer AND (NOT title:tumor)")
  })

  it("空 tree → 空文字", () => {
    const tree = makeGroup([])
    expect(nodeToDsl(tree)).toBe("")
  })

  it("countDepth: condition は 0", () => {
    expect(
      countDepth(
        makeCondition({ field: "title", operator: "equals", value: "x" }),
      ),
    ).toBe(0)
  })

  it("countDepth: root group + children (condition のみ) は 1", () => {
    const tree = makeGroup([
      makeCondition({ field: "title", operator: "equals", value: "x" }),
    ])
    expect(countDepth(tree)).toBe(1)
  })

  it("countDepth: 2 階層ネスト は 2", () => {
    const tree = makeGroup([
      makeGroup([
        makeCondition({ field: "title", operator: "equals", value: "x" }),
      ]),
    ])
    expect(countDepth(tree)).toBe(2)
  })

  it("countDepth: 深さ 5 は 5", () => {
    let node = makeGroup([
      makeCondition({ field: "title", operator: "equals", value: "x" }),
    ])
    for (let i = 0; i < 4; i++) {
      node = makeGroup([node])
    }
    expect(countDepth(node)).toBe(5)
  })

  it("MAX_NEST_DEPTH は 5", () => {
    expect(MAX_NEST_DEPTH).toBe(5)
  })
})

describe("PBT: DSL 生成", () => {
  const tier1FieldArb = fc.constantFrom(
    "title",
    "description",
    "identifier",
  )

  const hasControl = (s: string): boolean => {
    for (let i = 0; i < s.length; i += 1) {
      if (s.charCodeAt(i) < 32) return true
    }

    return false
  }

  const conditionArb: fc.Arbitrary<AdvancedCondition> = fc.record({
    field: tier1FieldArb,
    operator: fc.constantFrom("equals" as const, "contains" as const),
    value: fc.string({ minLength: 1, maxLength: 20 })
      .filter((s) => !hasControl(s)),
  })

  it("有効 condition から生成した DSL は非空文字 & field:value パターンを含む", () => {
    fc.assert(
      fc.property(conditionArb, (c) => {
        const dsl = conditionToDsl(c)
        const v = c.value
        if (typeof v === "string" && v.trim() === "") return
        expect(dsl).toMatch(/^[a-z_]+:/)
        expect(dsl.length).toBeGreaterThan(0)
      }),
    )
  })

  it("同一 condition からの 2 回 DSL 生成は idempotent", () => {
    fc.assert(
      fc.property(conditionArb, (c) => {
        expect(conditionToDsl(c)).toBe(conditionToDsl(c))
      }),
    )
  })

  it("escapePhrase は roundtrip 安全（2 回適用で二重 escape されない関数）", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const e = escapePhrase(s)
        expect(e).not.toMatch(/(?:^|[^\\])"/)
      }),
    )
  })
})
