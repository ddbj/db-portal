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

  test("singleOrganism_returnsTaxIdLeafValue", () => {
    const state = { ...createInitialSearchFacetState(), organisms: ["9606"] }
    const ast = expectEq(fromSidebar(state))
    expect(ast.field).toBe("organism_id")
    expect(ast.value).toBe("9606")
  })

  test("multipleOrganisms_returnsOrOfEq", () => {
    const state = { ...createInitialSearchFacetState(), organisms: ["9606", "10090"] }
    const node = fromSidebar(state)
    const or = expectOr(node)
    expect(or.rules.length).toBe(2)
    const first = expectEq(or.rules[0] as ParseNode)
    expect(first.field).toBe("organism_id")
    expect(first.value).toBe("9606")
  })

  test("submittersIncludedOnlyWhenDbSelected", () => {
    const state = {
      ...createInitialSearchFacetState(),
      submitters: ["RIKEN"],
    }
    const crossNode = fromSidebar(state, { db: null })
    expect(isIdentityAst(crossNode)).toBe(true)
    const dbNode = fromSidebar(state, { db: "bioproject" })
    const eq = expectEq(dbNode)
    expect(eq.field).toBe("submitter")
    expect(eq.value).toBe("RIKEN")
  })

  test("studyTypeIncludedOnlyForSra", () => {
    const state = {
      ...createInitialSearchFacetState(),
      studyType: "Whole Genome Sequencing",
    }
    // library_strategy is SRA-only; cross mode and other DBs must not emit it.
    expect(isIdentityAst(fromSidebar(state, { db: null }))).toBe(true)
    expect(isIdentityAst(fromSidebar(state, { db: "bioproject" }))).toBe(true)
    const sraNode = fromSidebar(state, { db: "sra" })
    const eq = expectEq(sraNode)
    expect(eq.field).toBe("library_strategy")
    expect(eq.value).toBe("Whole Genome Sequencing")
  })

  test("dateRangePreset_returnsBetween", () => {
    const state = {
      ...createInitialSearchFacetState(),
      datePublished: { active: "1y" as const, from: "", to: "" },
    }
    const node = expectBetween(fromSidebar(state))
    expect(node.field).toBe("date_published")
    expect(node.from).not.toBe("")
  })
})
