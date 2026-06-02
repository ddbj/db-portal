import { test } from "@fast-check/vitest"
import fc from "fast-check"
import { describe, expect } from "vitest"

import {
  type NewsFacetState,
  parseNewsFacetState,
  serializeNewsFacetState,
} from "~/features/news"
import { NewsCategory, NewsSource } from "~/lib/api"

// Valid domain for NewsFacetState as the URL codec accepts it:
// - source / category drawn from the controlled enums
// - year integers strictly above 1900
// - service lowercase, non-empty, free of comma and surrounding whitespace
//   (the codec splits on "," and trims, so those would not survive a round-trip)
// Duplicates are intentionally allowed: the codec sorts but does not dedup,
// so the round-trip target keeps repeated entries.
const arbService = fc
  .stringMatching(/^[a-z0-9_-]+$/)
  .filter((s) => s.length > 0 && s.length <= 16)

const arbState: fc.Arbitrary<NewsFacetState> = fc.record({
  source: fc.array(fc.constantFrom(...NewsSource.options), { maxLength: 6 }),
  category: fc.array(fc.constantFrom(...NewsCategory.options), { maxLength: 12 }),
  year: fc.array(fc.integer({ min: 1901, max: 9999 }), { maxLength: 10 }),
  service: fc.array(arbService, { maxLength: 10 }),
  page: fc.integer({ min: 1, max: 100_000 }),
  sort: fc.constantFrom("newest" as const, "oldest" as const),
})

// The codec's normalization: each list sorted with the same comparator
// serialize uses (lexicographic for source/category/service, descending for
// year), duplicates preserved, page and sort passed through unchanged.
const normalize = (state: NewsFacetState): NewsFacetState => ({
  source: [...state.source].sort(),
  category: [...state.category].sort(),
  year: [...state.year].sort((a, b) => b - a),
  service: [...state.service].sort(),
  page: state.page,
  sort: state.sort,
})

describe("news facet url state round-trip PBT", () => {
  test.prop([arbState], { numRuns: 1000 })(
    "parseNewsFacetState_serializedValidState_recoversNormalizedState",
    (state) => {
      const parsed = parseNewsFacetState(serializeNewsFacetState(state))
      expect(parsed).toEqual(normalize(state))
    },
  )

  test.prop([arbState], { numRuns: 1000 })(
    "serializeNewsFacetState_afterParseRoundTrip_isIdempotent",
    (state) => {
      const once = serializeNewsFacetState(state)
      const twice = serializeNewsFacetState(parseNewsFacetState(once))
      expect(twice).toBe(once)
    },
  )

  test.prop([arbState], { numRuns: 1000 })(
    "parseNewsFacetState_isIdempotentOnAlreadySerializedQuery",
    (state) => {
      const serialized = serializeNewsFacetState(state)
      const parsedOnce = parseNewsFacetState(serialized)
      const parsedTwice = parseNewsFacetState(serializeNewsFacetState(parsedOnce))
      expect(parsedTwice).toEqual(parsedOnce)
    },
  )

  test.prop([arbState], { numRuns: 1000 })(
    "serializeNewsFacetState_sortsEachFacetCanonically",
    (state) => {
      const parsed = parseNewsFacetState(serializeNewsFacetState(state))
      expect([...parsed.source]).toEqual([...parsed.source].sort())
      expect([...parsed.category]).toEqual([...parsed.category].sort())
      expect([...parsed.service]).toEqual([...parsed.service].sort())
      expect([...parsed.year]).toEqual([...parsed.year].sort((a, b) => b - a))
    },
  )

  test.prop([arbState], { numRuns: 1000 })(
    "serializeNewsFacetState_isInvariantToInputOrdering",
    (state) => {
      const shuffled: NewsFacetState = {
        ...state,
        source: [...state.source].reverse(),
        category: [...state.category].reverse(),
        year: [...state.year].reverse(),
        service: [...state.service].reverse(),
      }
      expect(serializeNewsFacetState(shuffled)).toBe(serializeNewsFacetState(state))
    },
  )
})
