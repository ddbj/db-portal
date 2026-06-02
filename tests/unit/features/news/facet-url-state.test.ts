import { describe, expect, test } from "vitest"

import {
  clearFacet,
  emptyNewsFacetState,
  type NewsFacetState,
  parseNewsFacetState,
  serializeNewsFacetState,
  setPage,
  setSort,
  toggleCategory,
  toggleService,
  toggleSource,
  toggleYear,
} from "~/features/news"

const facetWith = (overrides: Partial<NewsFacetState>): NewsFacetState => ({
  ...emptyNewsFacetState(),
  ...overrides,
})

describe("toggleCategory", () => {
  test("toggleCategory_absentValue_addsAndResetsPage", () => {
    const next = toggleCategory(facetWith({ category: ["announcement"], page: 4 }), "event")
    expect(next.category).toEqual(["announcement", "event"])
    expect(next.page).toBe(1)
  })

  test("toggleCategory_presentValue_removesAndResetsPage", () => {
    const next = toggleCategory(facetWith({ category: ["announcement", "event"], page: 7 }), "announcement")
    expect(next.category).toEqual(["event"])
    expect(next.page).toBe(1)
  })

  test("toggleCategory_doesNotMutateInput", () => {
    const state = facetWith({ category: ["announcement"], page: 3 })
    toggleCategory(state, "event")
    expect(state.category).toEqual(["announcement"])
    expect(state.page).toBe(3)
  })

  test("toggleCategory_leavesOtherGroupsUntouched", () => {
    const next = toggleCategory(facetWith({ source: ["ddbj"], year: [2024], service: ["sra"] }), "service")
    expect(next.source).toEqual(["ddbj"])
    expect(next.year).toEqual([2024])
    expect(next.service).toEqual(["sra"])
  })
})

describe("toggleSource / toggleYear / toggleService page reset", () => {
  test("toggleSource_anyValue_resetsPageToOne", () => {
    expect(toggleSource(facetWith({ page: 9 }), "ddbj").page).toBe(1)
  })

  test("toggleYear_anyValue_resetsPageToOne", () => {
    expect(toggleYear(facetWith({ page: 9 }), 2024).page).toBe(1)
  })

  test("toggleService_anyValue_resetsPageToOne", () => {
    expect(toggleService(facetWith({ page: 9 }), "sra").page).toBe(1)
  })

  test("toggleYear_presentValue_removesByNumericEquality", () => {
    const next = toggleYear(facetWith({ year: [2024, 2023] }), 2024)
    expect(next.year).toEqual([2023])
  })
})

describe("serializeNewsFacetState omissions", () => {
  test("serialize_emptyState_returnsEmptyString", () => {
    expect(serializeNewsFacetState(emptyNewsFacetState())).toBe("")
  })

  test("serialize_sortNewest_omitsSortParam", () => {
    expect(serializeNewsFacetState(facetWith({ sort: "newest" }))).toBe("")
  })

  test("serialize_pageOne_omitsPageParam", () => {
    expect(serializeNewsFacetState(facetWith({ page: 1 }))).toBe("")
  })

  test("serialize_sortOldest_emitsSortParam", () => {
    expect(serializeNewsFacetState(facetWith({ sort: "oldest" }))).toBe("?sort=oldest")
  })

  test("serialize_pageGreaterThanOne_emitsPageParam", () => {
    expect(serializeNewsFacetState(facetWith({ page: 3 }))).toBe("?page=3")
  })
})

describe("serializeNewsFacetState ordering", () => {
  test("serialize_source_emitsAlphabetAscending", () => {
    expect(serializeNewsFacetState(facetWith({ source: ["ddbj", "dbcls"] }))).toBe(
      `?source=${encodeURIComponent("dbcls,ddbj")}`,
    )
  })

  test("serialize_category_emitsAlphabetAscending", () => {
    const qs = serializeNewsFacetState(facetWith({ category: ["service", "announcement", "event"] }))
    expect(qs).toBe(`?category=${encodeURIComponent("announcement,event,service")}`)
  })

  test("serialize_service_emitsAlphabetAscending", () => {
    expect(serializeNewsFacetState(facetWith({ service: ["sra", "bioproject"] }))).toBe(
      `?service=${encodeURIComponent("bioproject,sra")}`,
    )
  })

  test("serialize_year_emitsDescending", () => {
    expect(serializeNewsFacetState(facetWith({ year: [2022, 2024, 2023] }))).toBe(
      `?year=${encodeURIComponent("2024,2023,2022")}`,
    )
  })
})

describe("parseNewsFacetState year filter", () => {
  test("parse_yearBoundary1900_excluded", () => {
    expect(parseNewsFacetState("?year=1900").year).toEqual([])
  })

  test("parse_yearBoundary1901_included", () => {
    expect(parseNewsFacetState("?year=1901").year).toEqual([1901])
  })

  test("parse_yearNonInteger_excluded", () => {
    expect(parseNewsFacetState("?year=2024.5").year).toEqual([])
  })

  test("parse_yearNonNumeric_excluded", () => {
    expect(parseNewsFacetState("?year=abc").year).toEqual([])
  })

  test("parse_yearMixed_keepsOnlyValidYears", () => {
    expect(parseNewsFacetState("?year=1900,2023,abc,2024").year).toEqual([2023, 2024])
  })
})

describe("parseNewsFacetState other fields", () => {
  test("parse_unknownSourceAndCategory_dropped", () => {
    const state = parseNewsFacetState("?source=ddbj,bogus&category=event,notreal")
    expect(state.source).toEqual(["ddbj"])
    expect(state.category).toEqual(["event"])
  })

  test("parse_serviceMixedCase_lowercased", () => {
    expect(parseNewsFacetState("?service=BioProject,SRA").service).toEqual(["bioproject", "sra"])
  })

  test("parse_invalidSort_fallsBackToNewest", () => {
    expect(parseNewsFacetState("?sort=sideways").sort).toBe("newest")
  })

  test("parse_oldestSort_preserved", () => {
    expect(parseNewsFacetState("?sort=oldest").sort).toBe("oldest")
  })

  test("parse_pageZero_clampedToOne", () => {
    expect(parseNewsFacetState("?page=0").page).toBe(1)
  })

  test("parse_pageNegative_clampedToOne", () => {
    expect(parseNewsFacetState("?page=-5").page).toBe(1)
  })

  test("parse_pageNonNumeric_fallsBackToOne", () => {
    expect(parseNewsFacetState("?page=foo").page).toBe(1)
  })

  test("parse_emptySearch_returnsEmptyState", () => {
    expect(parseNewsFacetState("")).toEqual(emptyNewsFacetState())
  })

  test("parse_searchWithoutLeadingQuestionMark_parsed", () => {
    expect(parseNewsFacetState("source=dbcls&page=2")).toEqual(
      facetWith({ source: ["dbcls"], page: 2 }),
    )
  })

  test("parse_listEntriesTrimmedAndBlanksDropped", () => {
    const state = parseNewsFacetState("?source= ddbj , , dbcls ")
    expect(state.source).toEqual(["ddbj", "dbcls"])
  })
})

describe("clearFacet", () => {
  test("clearFacet_source_clearsSourceAndResetsPage", () => {
    const next = clearFacet(facetWith({ source: ["ddbj", "dbcls"], category: ["event"], page: 5 }), "source")
    expect(next.source).toEqual([])
    expect(next.category).toEqual(["event"])
    expect(next.page).toBe(1)
  })

  test("clearFacet_year_clearsYearAndResetsPage", () => {
    const next = clearFacet(facetWith({ year: [2024, 2023], page: 8 }), "year")
    expect(next.year).toEqual([])
    expect(next.page).toBe(1)
  })

  test("clearFacet_service_clearsServiceAndResetsPage", () => {
    const next = clearFacet(facetWith({ service: ["sra"], source: ["ddbj"], page: 2 }), "service")
    expect(next.service).toEqual([])
    expect(next.source).toEqual(["ddbj"])
    expect(next.page).toBe(1)
  })
})

describe("setPage / setSort", () => {
  test("setPage_belowOne_clampedToOne", () => {
    expect(setPage(facetWith({ page: 3 }), 0).page).toBe(1)
    expect(setPage(facetWith({ page: 3 }), -2).page).toBe(1)
  })

  test("setPage_validPage_kept", () => {
    expect(setPage(emptyNewsFacetState(), 4).page).toBe(4)
  })

  test("setSort_resetsPageToOne", () => {
    const next = setSort(facetWith({ page: 6 }), "oldest")
    expect(next.sort).toBe("oldest")
    expect(next.page).toBe(1)
  })
})

describe("parse / serialize round trip", () => {
  test("serializeThenParse_restoresState", () => {
    const state = facetWith({
      source: ["dbcls", "ddbj"],
      category: ["event", "announcement"],
      year: [2022, 2024],
      service: ["sra", "bioproject"],
      page: 3,
      sort: "oldest",
    })
    const restored = parseNewsFacetState(serializeNewsFacetState(state))
    expect(restored).toEqual({
      source: ["dbcls", "ddbj"],
      category: ["announcement", "event"],
      year: [2024, 2022],
      service: ["bioproject", "sra"],
      page: 3,
      sort: "oldest",
    })
  })
})
