import { describe, expect, test } from "vitest"

import { canonicalizeAst, fromAdvanced, toAdvanced } from "~/features/search"
import type { ParseNode } from "~/lib/api"

// docs/search.md L121-122 の不変量 fromAdvanced(toAdvanced(ast)) ≡ canonicalize(ast) を
// top-level NOT(group) について pin する。 raw URL `?q=NOT(...)` 共有経由でしか辿り着けない
// ケースで、 builder state は root.combinator が AND 固定なので NOT(group) は AND root の
// 唯一の子として保持されなければならない。

const cond = (field: string, value: string): ParseNode => ({
  op: "contains",
  field,
  value,
})

const and = (children: ParseNode[]): ParseNode => ({ op: "AND", rules: children })
const or = (children: ParseNode[]): ParseNode => ({ op: "OR", rules: children })
const not = (child: ParseNode): ParseNode => ({ op: "NOT", rules: [child] })

describe("toAdvanced — top-level NOT(group) round-trip", () => {
  test("toAdvanced_topLevelNotAnd_preservesNegationOnRootChild", () => {
    // Input AST: NOT(AND(title:cancer, organism_name:mouse))
    const ast: ParseNode = not(and([cond("title", "cancer"), cond("organism_name", "mouse")]))
    const state = toAdvanced(ast)

    expect(state.root.children.length).toBe(1)
    const child = state.root.children[0]!
    expect(child.kind).toBe("group")
    expect(child.combinator).toBe("NOT")
  })

  test("toAdvanced_topLevelNotOr_preservesNegationOnRootChild", () => {
    const ast: ParseNode = not(or([cond("title", "cancer"), cond("title", "tumor")]))
    const state = toAdvanced(ast)

    expect(state.root.children.length).toBe(1)
    const child = state.root.children[0]!
    expect(child.kind).toBe("group")
    expect(child.combinator).toBe("NOT")
  })

  test("fromAdvanced_toAdvanced_topLevelNotAnd_roundTripsToCanonicalAst", () => {
    const ast: ParseNode = not(and([cond("title", "cancer"), cond("organism_name", "mouse")]))
    const back = fromAdvanced(toAdvanced(ast))

    expect(canonicalizeAst(back)).toEqual(canonicalizeAst(ast))
  })

  test("fromAdvanced_toAdvanced_topLevelNotOr_roundTripsToCanonicalAst", () => {
    const ast: ParseNode = not(or([cond("title", "cancer"), cond("title", "tumor")]))
    const back = fromAdvanced(toAdvanced(ast))

    expect(canonicalizeAst(back)).toEqual(canonicalizeAst(ast))
  })

  test("toAdvanced_plainTopLevelAnd_unchangedRootChildren", () => {
    // 既存パスの regression 防止: NOT がない top-level group は今まで通り平坦化される。
    const ast: ParseNode = and([cond("title", "cancer"), cond("organism_name", "mouse")])
    const state = toAdvanced(ast)

    expect(state.root.innerCombinator).toBe("AND")
    expect(state.root.children).toHaveLength(2)
    // 子に NOT が混ざらない
    for (const c of state.root.children) {
      expect(c.combinator).not.toBe("NOT")
    }
  })
})
