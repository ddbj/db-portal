import { describe, expect, test } from "vitest"

import {
  buildResultsHref,
  buildSearchHref,
  DEFAULT_PAGE,
  DEFAULT_PER_PAGE,
  DEFAULT_SORT,
  readSearchParams,
  writeSearchParams,
} from "~/features/search"

describe("url-params", () => {
  test("readSearchParams_empty_returnsDefaults", () => {
    const state = readSearchParams(new URLSearchParams())
    expect(state).toEqual({
      q: "",
      db: null,
      page: DEFAULT_PAGE,
      perPage: DEFAULT_PER_PAGE,
      sort: DEFAULT_SORT,
    })
  })

  test("readSearchParams_validValues_areParsed", () => {
    const state = readSearchParams(new URLSearchParams("q=cancer&db=bioproject&page=3&perPage=50&sort=date_desc"))
    expect(state).toEqual({
      q: "cancer",
      db: "bioproject",
      page: 3,
      perPage: 50,
      sort: "date_desc",
    })
  })

  test("readSearchParams_invalidDbAndSort_fallbackToDefaults", () => {
    const state = readSearchParams(new URLSearchParams("db=foo&sort=bogus&perPage=99&page=0"))
    expect(state.db).toBe(null)
    expect(state.sort).toBe(DEFAULT_SORT)
    expect(state.perPage).toBe(DEFAULT_PER_PAGE)
    expect(state.page).toBe(DEFAULT_PAGE)
  })

  test("writeSearchParams_omitsDefaultValues", () => {
    const params = writeSearchParams({ q: "", db: null, page: DEFAULT_PAGE, perPage: DEFAULT_PER_PAGE, sort: DEFAULT_SORT })
    expect(params.toString()).toBe("")
  })

  test("writeSearchParams_writesNonDefaults", () => {
    const params = writeSearchParams({ q: "cancer", db: "bioproject", page: 2, perPage: 50, sort: "date_desc" })
    expect(params.get("q")).toBe("cancer")
    expect(params.get("db")).toBe("bioproject")
    expect(params.get("page")).toBe("2")
    expect(params.get("perPage")).toBe("50")
    expect(params.get("sort")).toBe("date_desc")
  })

  test("buildResultsHref_queryOnly_buildsRootPathWithQ", () => {
    expect(buildResultsHref({ q: "cancer" })).toBe("/search/results?q=cancer")
  })

  test("buildResultsHref_emptyQuery_omitsQParam", () => {
    expect(buildResultsHref({ q: "" })).toBe("/search/results")
  })

  test("buildResultsHref_dbOnly_omitsQAndKeepsDb", () => {
    expect(buildResultsHref({ db: "bioproject" })).toBe("/search/results?db=bioproject")
  })

  test("buildResultsHref_dbNull_omitsDbParam", () => {
    expect(buildResultsHref({ q: "x", db: null })).toBe("/search/results?q=x")
  })

  test("buildResultsHref_qAndDb_includesBoth", () => {
    expect(buildResultsHref({ q: "cancer", db: "sra" })).toBe("/search/results?q=cancer&db=sra")
  })

  test("buildResultsHref_emptyState_returnsBasePath", () => {
    expect(buildResultsHref({})).toBe("/search/results")
  })

  test("buildResultsHref_pageNonDefault_includesPage", () => {
    expect(buildResultsHref({ q: "x", page: 3 })).toBe("/search/results?q=x&page=3")
  })

  test("buildResultsHref_pageDefault_omitsPage", () => {
    expect(buildResultsHref({ q: "x", page: DEFAULT_PAGE })).toBe("/search/results?q=x")
  })

  test("buildSearchHref_returnsSearchPath", () => {
    expect(buildSearchHref()).toBe("/search")
  })
})
