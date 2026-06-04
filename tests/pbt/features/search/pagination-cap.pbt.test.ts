import { fc, test } from "@fast-check/vitest"
import { describe, expect } from "vitest"

import {
  maxReachablePage,
  PER_PAGE_VALUES,
  type PerPageValue,
  reachablePageCount,
  SEARCH_HARD_LIMIT,
} from "~/features/search"

const arbPerPage = fc.constantFrom<PerPageValue>(...PER_PAGE_VALUES)
const arbTotal = fc.nat({ max: 500000 })

describe("pagination deep paging cap", () => {
  test.prop([arbPerPage])(
    "maxReachablePage_isTheDeepestPageWithinLimit",
    (perPage) => {
      const last = maxReachablePage(perPage)
      // The last reachable page fits under the limit, and the next page would not.
      expect(last * perPage).toBeLessThanOrEqual(SEARCH_HARD_LIMIT)
      expect((last + 1) * perPage).toBeGreaterThan(SEARCH_HARD_LIMIT)
    },
  )

  test.prop([arbTotal, arbPerPage])(
    "reachablePageCount_neverOffersAPageThatTripsTheLimit",
    (total, perPage) => {
      // The deepest offered page is the count itself, so count * perPage staying
      // within the limit means every page 1..count is safe to request.
      expect(reachablePageCount(total, perPage) * perPage).toBeLessThanOrEqual(SEARCH_HARD_LIMIT)
    },
  )

  test.prop([arbTotal, arbPerPage])(
    "reachablePageCount_neverInventsPagesBeyondTheData",
    (total, perPage) => {
      const dataPages = total <= 0 ? 0 : Math.ceil(total / perPage)
      expect(reachablePageCount(total, perPage)).toBeLessThanOrEqual(dataPages)
    },
  )

  test.prop([fc.nat({ max: SEARCH_HARD_LIMIT }), arbPerPage])(
    "reachablePageCount_belowLimit_matchesDataPages",
    (total, perPage) => {
      // Below the hard limit the cap must not kick in: the user can page through
      // all of their hits.
      const dataPages = total <= 0 ? 0 : Math.ceil(total / perPage)
      expect(reachablePageCount(total, perPage)).toBe(dataPages)
    },
  )

  test.prop([fc.integer({ min: 1, max: 500000 }), arbPerPage])(
    "reachablePageCount_withHits_lastPageHoldsHits",
    (total, perPage) => {
      // No trailing empty page: the page before the last starts within `total`.
      const count = reachablePageCount(total, perPage)
      expect(count).toBeGreaterThanOrEqual(1)
      expect((count - 1) * perPage).toBeLessThan(total)
    },
  )
})
