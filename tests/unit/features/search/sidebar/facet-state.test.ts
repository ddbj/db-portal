import { describe, expect, test } from "vitest"

import {
  createInitialSearchFacetState,
  searchFacetReducer,
  type SearchFacetState,
} from "~/features/search"

const withOrganism = (values: string[]): SearchFacetState => ({
  ...createInitialSearchFacetState(),
  facets: { organism: values },
})

describe("searchFacetReducer setFacet", () => {
  test("replacesEntireArray", () => {
    const next = searchFacetReducer(withOrganism(["9606"]), {
      type: "setFacet",
      key: "organism",
      values: ["10090", "7227"],
    })
    expect(next.facets.organism).toEqual(["10090", "7227"])
  })

  test("setsEmptyArray", () => {
    const next = searchFacetReducer(withOrganism(["9606"]), {
      type: "setFacet",
      key: "organism",
      values: [],
    })
    expect(next.facets.organism).toEqual([])
  })

  test("leavesOtherFacetKeysUntouched", () => {
    const state: SearchFacetState = {
      ...createInitialSearchFacetState(),
      facets: { organism: ["9606"], accessibility: ["public-access"] },
    }
    const next = searchFacetReducer(state, { type: "setFacet", key: "organism", values: ["10090"] })
    expect(next.facets.accessibility).toEqual(["public-access"])
  })

  test("doesNotMutateInputState", () => {
    const state = withOrganism(["9606"])
    searchFacetReducer(state, { type: "setFacet", key: "organism", values: ["10090"] })
    expect(state.facets.organism).toEqual(["9606"])
  })
})
