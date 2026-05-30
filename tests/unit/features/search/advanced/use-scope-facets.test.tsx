import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"

import { useScopeFacets } from "~/features/search"

import { server } from "../../../mocks/server"

const BASE = "https://api.test"
const CROSS_URL = `${BASE}/db-portal/cross-search`
const DB_URL = `${BASE}/db-portal/search`

const wrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
}

const accessibilityFacets = {
  accessibility: [
    { value: "public-access", count: 100 },
    { value: "controlled-access", count: 5 },
  ],
}

describe("useScopeFacets", () => {
  test("crossScope_callsCrossSearchWithScopeFacetParam_andReturnsFacets", async () => {
    let captured: URL | null = null
    server.use(
      http.get(CROSS_URL, ({ request }) => {
        captured = new URL(request.url)

        return HttpResponse.json({ databases: [], facets: accessibilityFacets })
      }),
    )

    const { result } = renderHook(() => useScopeFacets(null, BASE), { wrapper: wrapper() })

    await waitFor(() => expect(result.current).not.toBeNull())
    expect(result.current?.accessibility?.[0]?.value).toBe("public-access")
    const url = captured as unknown as URL
    // cross requests the cross facet set (organism + accessibility) and no hits.
    expect(url.searchParams.get("facets")).toBe("organism,accessibility")
    expect(url.searchParams.get("topHits")).toBe("0")
  })

  test("perDbScope_callsDbSearchWithDbAndFacets", async () => {
    let captured: URL | null = null
    server.use(
      http.get(DB_URL, ({ request }) => {
        captured = new URL(request.url)

        return HttpResponse.json({ hits: [], count: 0, facets: accessibilityFacets })
      }),
    )

    const { result } = renderHook(() => useScopeFacets("sra", BASE), { wrapper: wrapper() })

    await waitFor(() => expect(result.current).not.toBeNull())
    const url = captured as unknown as URL
    expect(url.searchParams.get("db")).toBe("sra")
    // sra's facet set includes its Tier 3 enum facets.
    expect(url.searchParams.get("facets")).toContain("libraryStrategy")
  })

  test("apiFailure_returnsNull_soBuilderDegradesToFreeText", async () => {
    let called = false
    server.use(
      http.get(CROSS_URL, () => {
        called = true

        return new HttpResponse(null, { status: 500 })
      }),
    )

    const { result } = renderHook(() => useScopeFacets(null, BASE), { wrapper: wrapper() })

    // Wait until the request actually fired, then confirm the hook degraded to null.
    await waitFor(() => expect(called).toBe(true))
    expect(result.current).toBeNull()
  })

  test("nullFacetsInResponse_returnsNull", async () => {
    let called = false
    server.use(
      http.get(CROSS_URL, () => {
        called = true

        return HttpResponse.json({ databases: [], facets: null })
      }),
    )

    const { result } = renderHook(() => useScopeFacets(null, BASE), { wrapper: wrapper() })

    await waitFor(() => expect(called).toBe(true))
    expect(result.current).toBeNull()
  })
})
