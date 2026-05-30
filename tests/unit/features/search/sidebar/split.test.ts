import { describe, expect, test } from "vitest"

import { isIdentityAst, splitForSidebar } from "~/features/search"
import type { ParseNode } from "~/lib/api"

const organismLeaf = (value: string): ParseNode => ({ op: "eq", field: "organism_id", value })

describe("splitForSidebar", () => {
  test("extractsOrganismFacet", () => {
    const { sidebar, rest } = splitForSidebar(organismLeaf("9606"))
    expect(sidebar.facets.organism).toEqual(["9606"])
    expect(isIdentityAst(rest)).toBe(true)
  })

  test("extractsOrOfOrganisms", () => {
    const ast: ParseNode = { op: "OR", rules: [organismLeaf("9606"), organismLeaf("10090")] }
    const { sidebar } = splitForSidebar(ast)
    expect(sidebar.facets.organism).toEqual(["9606", "10090"])
  })

  test("extractsTextField", () => {
    const ast: ParseNode = { op: "contains", field: "submitter", value: "RIKEN" }
    const { sidebar, rest } = splitForSidebar(ast, "bioproject")
    expect(sidebar.texts.submitter).toBe("RIKEN")
    expect(isIdentityAst(rest)).toBe(true)
  })

  test("extractsEnumFacet", () => {
    const ast: ParseNode = { op: "eq", field: "object_type", value: "BioProject" }
    const { sidebar } = splitForSidebar(ast, "bioproject")
    expect(sidebar.facets.objectType).toEqual(["BioProject"])
  })

  test("scopeAware_nonScopeFieldGoesToRest", () => {
    // object_type is not a cross-scope row → stays in rest.
    const ast: ParseNode = { op: "eq", field: "object_type", value: "BioProject" }
    const { sidebar, rest } = splitForSidebar(ast, null)
    expect(sidebar.facets.objectType).toBeUndefined()
    const leaf = rest as { op: string; field?: string }
    expect(leaf.field).toBe("object_type")
  })

  test("splitsMixedAndIntoSidebarAndRest", () => {
    const ast: ParseNode = {
      op: "AND",
      rules: [organismLeaf("9606"), { op: "eq", field: "title", value: "cancer" }],
    }
    const { sidebar, rest } = splitForSidebar(ast)
    expect(sidebar.facets.organism).toEqual(["9606"])
    const leaf = rest as { op: string; field?: string }
    expect(leaf.op).toBe("eq")
    expect(leaf.field).toBe("title")
  })

  test("nonSidebarLeaf_returnedInRest", () => {
    const ast: ParseNode = { op: "eq", field: "title", value: "cancer" }
    const { sidebar, rest } = splitForSidebar(ast)
    expect(sidebar.facets.organism).toBeUndefined()
    const leaf = rest as { op: string; field?: string }
    expect(leaf.field).toBe("title")
  })
})
