import { describe, expect, test } from "vitest"

import { createInitialSearchFacetState, fromSidebar, isIdentityAst, type SearchFacetState } from "~/features/search"
import type { ParseNode } from "~/lib/api"

type EqNode = { op: "eq"; field: string; value: string }
type ContainsNode = { op: "contains"; field: string; value: string }
type OrNode = { op: "OR"; rules: ParseNode[] }
type AndNode = { op: "AND"; rules: ParseNode[] }
type BetweenNode = { op: "between"; field: string; from: string; to: string }

const expectEq = (node: ParseNode): EqNode => {
  if (node.op !== "eq") throw new Error(`expected eq, got ${node.op}`)

  return node as EqNode
}

const expectContains = (node: ParseNode): ContainsNode => {
  if (node.op !== "contains") throw new Error(`expected contains, got ${node.op}`)

  return node as ContainsNode
}

const expectOr = (node: ParseNode): OrNode => {
  if (node.op !== "OR") throw new Error(`expected OR, got ${node.op}`)

  return node as OrNode
}

const expectAnd = (node: ParseNode): AndNode => {
  if (node.op !== "AND") throw new Error(`expected AND, got ${node.op}`)

  return node as AndNode
}

const expectBetween = (node: ParseNode): BetweenNode => {
  if (node.op !== "between") throw new Error(`expected between, got ${node.op}`)

  return node as BetweenNode
}

const withFacet = (key: string, values: string[]): SearchFacetState => ({
  ...createInitialSearchFacetState(),
  facets: { [key]: values },
})

const withText = (key: string, value: string): SearchFacetState => ({
  ...createInitialSearchFacetState(),
  texts: { [key]: value },
})

describe("fromSidebar", () => {
  test("emptyState_returnsIdentity", () => {
    expect(isIdentityAst(fromSidebar(createInitialSearchFacetState()))).toBe(true)
  })

  test("singleOrganism_returnsTaxIdEq", () => {
    const ast = expectEq(fromSidebar(withFacet("organism", ["9606"])))
    expect(ast.field).toBe("organism_id")
    expect(ast.value).toBe("9606")
  })

  test("multipleOrganisms_returnsOrOfEq", () => {
    const or = expectOr(fromSidebar(withFacet("organism", ["9606", "10090"])))
    expect(or.rules.length).toBe(2)
    const first = expectEq(or.rules[0] as ParseNode)
    expect(first.field).toBe("organism_id")
    expect(first.value).toBe("9606")
  })

  test("organismNameText_emitsContainsInCross", () => {
    // organism_name is now a cross-scope text row, so the sidebar emits it.
    const contains = expectContains(fromSidebar(withText("organismName", "Homo sapiens"), { db: null }))
    expect(contains.field).toBe("organism_name")
    expect(contains.value).toBe("Homo sapiens")
  })

  test("organismFacetAndNameText_coexistInCross", () => {
    const state: SearchFacetState = {
      ...createInitialSearchFacetState(),
      facets: { organism: ["9606"] },
      texts: { organismName: "Homo sapiens" },
    }
    const ast = expectAnd(fromSidebar(state, { db: null }))
    const fields = ast.rules.map((rule) => (rule as { field?: string }).field)
    expect(fields).toContain("organism_id")
    expect(fields).toContain("organism_name")
  })

  test("enumFacetEmittedOnlyForOwningDb", () => {
    const state = withFacet("objectType", ["BioProject"])
    // object_type is bioproject Tier 3; cross must not emit it.
    expect(isIdentityAst(fromSidebar(state, { db: null }))).toBe(true)
    const eq = expectEq(fromSidebar(state, { db: "bioproject" }))
    expect(eq.field).toBe("object_type")
    expect(eq.value).toBe("BioProject")
  })

  test("textFieldEmitsContainsForOwningScope", () => {
    const state = withText("host", "Homo sapiens")
    // host is a biosample-only text row; cross must not emit it.
    expect(isIdentityAst(fromSidebar(state, { db: null }))).toBe(true)
    const contains = expectContains(fromSidebar(state, { db: "biosample" }))
    expect(contains.field).toBe("host")
    expect(contains.value).toBe("Homo sapiens")
  })

  test("organizationTextEmitsInCrossAndPerDb", () => {
    // organization (DSL field submitter) is a Tier 2 cross row: it emits in both
    // cross and per-DB scopes, always under the API field name submitter.
    const state = withText("organization", "RIKEN")
    const cross = expectContains(fromSidebar(state, { db: null }))
    expect(cross.field).toBe("submitter")
    expect(cross.value).toBe("RIKEN")
    expect(expectContains(fromSidebar(state, { db: "bioproject" })).field).toBe("submitter")
  })

  test("blankTextIgnored", () => {
    expect(isIdentityAst(fromSidebar(withText("organization", "   "), { db: "bioproject" }))).toBe(true)
  })

  test("dateRangePreset_returnsBetween", () => {
    const state: SearchFacetState = {
      ...createInitialSearchFacetState(),
      dateRanges: { datePublished: { active: "1y", from: "", to: "" } },
    }
    const node = expectBetween(fromSidebar(state))
    expect(node.field).toBe("date_published")
    expect(node.from).not.toBe("")
  })

  test("dateModifiedRange_emitsBetweenOnDateModified", () => {
    const state: SearchFacetState = {
      ...createInitialSearchFacetState(),
      dateRanges: { dateModified: { active: "custom", from: "2020-01-01", to: "2020-12-31" } },
    }
    const node = expectBetween(fromSidebar(state, { db: "sra" }))
    expect(node.field).toBe("date_modified")
    expect(node.from).toBe("2020-01-01")
    expect(node.to).toBe("2020-12-31")
  })

  test("dateRangeAll_returnsIdentity", () => {
    const state: SearchFacetState = {
      ...createInitialSearchFacetState(),
      dateRanges: { datePublished: { active: "all", from: "", to: "" } },
    }
    expect(isIdentityAst(fromSidebar(state))).toBe(true)
  })

  test("dateRangeCustom_halfFilled_returnsIdentity", () => {
    const state: SearchFacetState = {
      ...createInitialSearchFacetState(),
      dateRanges: { datePublished: { active: "custom", from: "2020-01-01", to: "" } },
    }
    expect(isIdentityAst(fromSidebar(state))).toBe(true)
  })

  test("numberRangeEmittedForTrad", () => {
    const state: SearchFacetState = {
      ...createInitialSearchFacetState(),
      ranges: { sequenceLength: { from: "100", to: "200" } },
    }
    const node = expectBetween(fromSidebar(state, { db: "ddbj" }))
    expect(node.field).toBe("sequence_length")
    expect(node.from).toBe("100")
    expect(node.to).toBe("200")
  })
})
