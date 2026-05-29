import { test } from "@fast-check/vitest"
import fc from "fast-check"
import { describe, expect } from "vitest"

import {
  parseServicesFacetState,
  serializeServicesFacetState,
  type ServicesFacetState,
} from "~/features/services"
import { ServiceCategory, ServiceSource } from "~/lib/api"

const arbState: fc.Arbitrary<ServicesFacetState> = fc.record({
  source: fc.subarray([...ServiceSource.options]),
  category: fc.subarray([...ServiceCategory.options]),
  page: fc.integer({ min: 1, max: 99 }),
  sort: fc.constantFrom("asc" as const, "desc" as const),
})

describe("services facet url state PBT", () => {
  test.prop([arbState])("serialize is stable under a parse round-trip", (state) => {
    const once = serializeServicesFacetState(state)
    const twice = serializeServicesFacetState(parseServicesFacetState(once))
    expect(twice).toBe(once)
  })

  test.prop([arbState])("parse recovers the canonical facet selection", (state) => {
    const parsed = parseServicesFacetState(serializeServicesFacetState(state))
    expect([...parsed.source].sort()).toEqual([...state.source].sort())
    expect([...parsed.category].sort()).toEqual([...state.category].sort())
    expect(parsed.sort).toBe(state.sort)
    expect(parsed.page).toBe(state.page)
  })
})
