import { describe, expect, test } from "vitest"

import { isIdentityAst, splitForSidebar } from "~/features/search"
import type { ParseNode } from "~/lib/api"

const organismLeaf = (value: string): ParseNode => ({ op: "eq", field: "organism_id", value })

describe("splitForSidebar", () => {
  test("extractsOrganismLeaf", () => {
    const { sidebar, rest } = splitForSidebar(organismLeaf("9606"))
    expect(sidebar.organisms).toEqual(["9606"])
    expect(isIdentityAst(rest)).toBe(true)
  })

  test("extractsOrOfOrganisms", () => {
    const ast: ParseNode = {
      op: "OR",
      rules: [organismLeaf("9606"), organismLeaf("10090")],
    }
    const { sidebar } = splitForSidebar(ast)
    expect(sidebar.organisms).toEqual(["9606", "10090"])
  })

  test("extractsSubmitterLeaf", () => {
    const ast: ParseNode = { op: "eq", field: "submitter", value: "RIKEN" }
    const { sidebar, rest } = splitForSidebar(ast)
    expect(sidebar.submitters).toEqual(["RIKEN"])
    expect(isIdentityAst(rest)).toBe(true)
  })

  test("splitsMixedAndIntoSidebarAndRest", () => {
    const ast: ParseNode = {
      op: "AND",
      rules: [
        organismLeaf("9606"),
        { op: "eq", field: "title", value: "cancer" },
      ],
    }
    const { sidebar, rest } = splitForSidebar(ast)
    expect(sidebar.organisms).toEqual(["9606"])
    const leaf = rest as { op: string; field?: string }
    expect(leaf.op).toBe("eq")
    expect(leaf.field).toBe("title")
  })

  test("nonSidebarLeaf_returnedInRest", () => {
    const ast: ParseNode = { op: "eq", field: "title", value: "cancer" }
    const { sidebar, rest } = splitForSidebar(ast)
    expect(sidebar.organisms).toEqual([])
    const leaf = rest as { op: string; field?: string }
    expect(leaf.field).toBe("title")
  })
})
