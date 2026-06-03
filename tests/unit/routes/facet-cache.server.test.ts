import { afterEach, describe, expect, test, vi } from "vitest"

import type { DbPortalFacets } from "~/lib/api"
import {
  clearMatchAllFacetCache,
  getCachedMatchAllFacets,
} from "~/routes/search-results/facet-cache.server"

afterEach(() => {
  clearMatchAllFacetCache()
  delete process.env.DB_PORTAL_FACET_CACHE_TTL_MS
  vi.useRealTimers()
})

describe("match_all facet cache", () => {
  test("cacheMiss_runsFetcherOnce_returnsResult", async () => {
    let calls = 0
    const facets = { package: [{ value: "x", count: 1 }] }
    const result = await getCachedMatchAllFacets("db:biosample", async () => {
      calls += 1

      return facets
    })
    expect(result).toEqual(facets)
    expect(calls).toBe(1)
  })

  test("cacheHit_skipsFetcher_withinTtl", async () => {
    let calls = 0
    const fetcher = async (): Promise<DbPortalFacets> => {
      calls += 1

      return { package: [{ value: "x", count: calls }] }
    }
    await getCachedMatchAllFacets("db:biosample", fetcher)
    const second = await getCachedMatchAllFacets("db:biosample", fetcher)
    expect(calls).toBe(1)
    expect(second).toEqual({ package: [{ value: "x", count: 1 }] })
  })

  test("differentScopes_cachedIndependently", async () => {
    const cross = await getCachedMatchAllFacets("cross", async () => ({
      organism: [{ value: "9606", count: 1, label: "Homo sapiens" }],
    }))
    const perDb = await getCachedMatchAllFacets("db:biosample", async () => ({
      package: [{ value: "x", count: 2 }],
    }))
    expect(cross).not.toEqual(perDb)
  })

  test("inflightRequests_shareSingleFetch", async () => {
    let calls = 0
    let resolveFetch!: (value: DbPortalFacets | null) => void
    const fetcher = (): Promise<DbPortalFacets | null> => {
      calls += 1

      return new Promise((resolve) => { resolveFetch = resolve })
    }
    const first = getCachedMatchAllFacets("cross", fetcher)
    const second = getCachedMatchAllFacets("cross", fetcher)
    resolveFetch({ organism: null })
    await Promise.all([first, second])
    expect(calls).toBe(1)
  })

  test("rejectedFetcher_notCached_retriesNextTime", async () => {
    let calls = 0
    const fetcher = async (): Promise<DbPortalFacets> => {
      calls += 1
      if (calls === 1) throw new Error("boom")

      return { package: [] }
    }
    await expect(getCachedMatchAllFacets("db:sra", fetcher)).rejects.toThrow("boom")
    const retry = await getCachedMatchAllFacets("db:sra", fetcher)
    expect(calls).toBe(2)
    expect(retry).toEqual({ package: [] })
  })

  test("expiredEntry_refetchesAfterTtl", async () => {
    vi.useFakeTimers()
    process.env.DB_PORTAL_FACET_CACHE_TTL_MS = "1000"
    let calls = 0
    const fetcher = async (): Promise<DbPortalFacets> => {
      calls += 1

      return { package: [{ value: "x", count: calls }] }
    }
    await getCachedMatchAllFacets("cross", fetcher)
    vi.advanceTimersByTime(1500)
    await getCachedMatchAllFacets("cross", fetcher)
    expect(calls).toBe(2)
  })
})
