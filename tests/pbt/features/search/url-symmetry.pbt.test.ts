import { fc, test } from "@fast-check/vitest"
import { describe, expect } from "vitest"

import {
  DB_SLUGS,
  type DbSlug,
  DEFAULT_PER_PAGE,
  DEFAULT_SORT,
  maxReachablePage,
  PER_PAGE_VALUES,
  type PerPageValue,
  readSearchParams,
  type SearchUrlState,
  SORT_KEYS,
  type SortKey,
  writeSearchParams,
} from "~/features/search"

const arbDb = fc.option(fc.constantFrom<DbSlug>(...DB_SLUGS), { freq: 3, nil: null })
const arbPerPage = fc.constantFrom<PerPageValue>(...PER_PAGE_VALUES)
const arbSort = fc.constantFrom<SortKey>(...SORT_KEYS)
// Spans well past every perPage's deep paging limit so the round-trip exercises
// the clamp in readSearchParams (perPage=100 caps at page 100).
const arbPage = fc.integer({ min: 1, max: 12000 })
const arbQ = fc.string({ maxLength: 24 })

const arbState: fc.Arbitrary<SearchUrlState> = fc.record({
  q: arbQ,
  db: arbDb,
  page: arbPage,
  perPage: arbPerPage,
  sort: arbSort,
})

describe("search URL symmetry", () => {
  test.prop([arbState])(
    "readWriteRoundtrip_preservesNonDefaults",
    (state) => {
      const written = writeSearchParams(state)
      const back = readSearchParams(written)
      expect(back.db).toBe(state.db)
      // page round-trips, except it is clamped to the deep paging limit so the
      // restored page never exceeds maxReachablePage(perPage).
      expect(back.page).toBe(Math.min(state.page, maxReachablePage(state.perPage)))
      if (state.perPage === DEFAULT_PER_PAGE) expect(back.perPage).toBe(DEFAULT_PER_PAGE)
      else expect(back.perPage).toBe(state.perPage)
      if (state.sort === DEFAULT_SORT) expect(back.sort).toBe(DEFAULT_SORT)
      else expect(back.sort).toBe(state.sort)
      if (state.q === "") expect(back.q).toBe("")
      else expect(back.q).toBe(state.q)
    },
  )

  test.prop([fc.dictionary(fc.string({ minLength: 1, maxLength: 6 }), fc.string())], { numRuns: 30 })(
    "readSearchParams_unknownParams_areIgnored",
    (extras) => {
      const params = new URLSearchParams(extras)
      const state = readSearchParams(params)
      // page must be 1+, perPage in allowed list, sort in allowed list
      expect(state.page).toBeGreaterThanOrEqual(1)
      expect(PER_PAGE_VALUES.includes(state.perPage)).toBe(true)
      expect(SORT_KEYS.includes(state.sort)).toBe(true)
    },
  )
})
