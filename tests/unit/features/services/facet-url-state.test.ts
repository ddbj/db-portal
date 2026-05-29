import { describe, expect, test } from "vitest"

import {
  emptyServicesFacetState,
  parseServicesFacetState,
  serializeServicesFacetState,
  setSort,
  toggleCategory,
  toggleSource,
} from "~/features/services"

describe("services facet url state", () => {
  test("parses an empty query to the empty state", () => {
    expect(parseServicesFacetState("")).toEqual(emptyServicesFacetState())
  })

  test("serializes the empty state to an empty string", () => {
    expect(serializeServicesFacetState(emptyServicesFacetState())).toBe("")
  })

  test("serializes facets with alphabetically sorted params", () => {
    const state = {
      ...emptyServicesFacetState(),
      source: ["dbcls", "ddbj"] as const,
      category: ["search", "repository"] as const,
      sort: "desc" as const,
      page: 2,
    }
    expect(serializeServicesFacetState(state)).toBe(
      "?source=dbcls%2Cddbj&category=repository%2Csearch&sort=desc&page=2",
    )
  })

  test("drops the default sort and first page from the query", () => {
    const state = { ...emptyServicesFacetState(), category: ["repository"] as const }
    expect(serializeServicesFacetState(state)).toBe("?category=repository")
  })

  test("ignores unknown source / category values", () => {
    const parsed = parseServicesFacetState("?source=ddbj,unknown&category=search,bogus")
    expect(parsed.source).toEqual(["ddbj"])
    expect(parsed.category).toEqual(["search"])
  })

  test("toggling a facet resets the page to 1", () => {
    const base = { ...emptyServicesFacetState(), page: 3 }
    expect(toggleSource(base, "ddbj").page).toBe(1)
    expect(toggleCategory(base, "repository").page).toBe(1)
    expect(setSort(base, "desc").page).toBe(1)
  })
})
