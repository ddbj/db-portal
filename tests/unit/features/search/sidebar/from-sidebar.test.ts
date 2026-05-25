import { describe, expect, test } from "vitest"

import { createInitialSearchFacetState, fromSidebar, isIdentityAst } from "~/features/search"
import type { ParseNode } from "~/lib/api"

type EqNode = { op: "eq"; field: string; value: string }
type OrNode = { op: "OR"; rules: ParseNode[] }
type BetweenNode = { op: "between"; field: string; from: string; to: string }

const expectEq = (node: ParseNode): EqNode => {
  if (node.op !== "eq") throw new Error(`expected eq, got ${node.op}`)

  return node as EqNode
}

const expectOr = (node: ParseNode): OrNode => {
  if (node.op !== "OR") throw new Error(`expected OR, got ${node.op}`)

  return node as OrNode
}

const expectBetween = (node: ParseNode): BetweenNode => {
  if (node.op !== "between") throw new Error(`expected between, got ${node.op}`)

  return node as BetweenNode
}

describe("fromSidebar", () => {
  test("emptyState_returnsIdentity", () => {
    expect(isIdentityAst(fromSidebar(createInitialSearchFacetState()))).toBe(true)
  })

  test("singleOrganism_returnsLeafValue", () => {
    const state = { ...createInitialSearchFacetState(), organisms: ["Homo sapiens"] }
    const ast = expectEq(fromSidebar(state))
    expect(ast.field).toBe("organism")
    expect(ast.value).toBe("Homo sapiens")
  })

  test("multipleOrganisms_returnsOrOfEq", () => {
    const state = { ...createInitialSearchFacetState(), organisms: ["Homo sapiens", "Mus musculus"] }
    const ast = expectOr(fromSidebar(state))
    expect(ast.rules.length).toBe(2)
  })

  test("submittersOmittedInCrossMode", () => {
    const state = { ...createInitialSearchFacetState(), submitters: ["RIKEN"] }
    const ast = fromSidebar(state, { db: null })
    expect(isIdentityAst(ast)).toBe(true)
  })

  test("submittersIncludedInPerDbMode", () => {
    const state = { ...createInitialSearchFacetState(), submitters: ["RIKEN"] }
    const ast = fromSidebar(state, { db: "bioproject" })
    expect(ast.op).toBe("eq")
  })

  test("dateRange_preset1y_emitsBetween", () => {
    const now = new Date("2024-06-01T00:00:00Z")
    const state = {
      ...createInitialSearchFacetState(),
      datePublished: { active: "1y" as const, from: "", to: "" },
    }
    const ast = expectBetween(fromSidebar(state, {}, now))
    expect(ast.field).toBe("date_published")
    expect(ast.to).toBe("2024-06-01")
    expect(ast.from).toBe("2023-06-01")
  })

  test("explicitFromTo_overridesPresetAll", () => {
    const state = {
      ...createInitialSearchFacetState(),
      datePublished: { active: "all" as const, from: "2020-01-01", to: "2024-12-31" },
    }
    const ast = expectBetween(fromSidebar(state))
    expect(ast.from).toBe("2020-01-01")
    expect(ast.to).toBe("2024-12-31")
  })
})
