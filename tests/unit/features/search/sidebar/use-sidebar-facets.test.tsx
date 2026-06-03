import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { http, HttpResponse } from "msw"
import type { ReactNode } from "react"
import { describe, expect, test } from "vitest"

import { useSidebarFacets } from "~/features/search"

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

const facets = { accessibility: [{ value: "public-access", count: 100 }] }

describe("useSidebarFacets", () => {
  test("withQuery_sendsQueryAndFacetSelfExclude", async () => {
    // The q-aware self-excluding aggregation moved off the SSR loader to here.
    let captured: URL | null = null
    server.use(
      http.get(DB_URL, ({ request }) => {
        captured = new URL(request.url)

        return HttpResponse.json({ hits: [], count: 0, facets })
      }),
    )

    const { result } = renderHook(
      () => useSidebarFacets("sra", "organism_id:9606", null, BASE),
      { wrapper: wrapper() },
    )

    await waitFor(() => expect(result.current.facets).not.toBeNull())
    const url = captured as unknown as URL
    expect(url.searchParams.get("q")).toBe("organism_id:9606")
    expect(url.searchParams.get("facetSelfExclude")).toBe("true")
  })

  test("emptyQuery_runsMatchAll_withoutQParam", async () => {
    let captured: URL | null = null
    server.use(
      http.get(DB_URL, ({ request }) => {
        captured = new URL(request.url)

        return HttpResponse.json({ hits: [], count: 0, facets })
      }),
    )

    const { result } = renderHook(() => useSidebarFacets("sra", "", null, BASE), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.facets).not.toBeNull())
    expect((captured as unknown as URL).searchParams.has("q")).toBe(false)
  })

  test("crossScope_callsCrossSearchWithScopeFacetParam", async () => {
    let captured: URL | null = null
    server.use(
      http.get(CROSS_URL, ({ request }) => {
        captured = new URL(request.url)

        return HttpResponse.json({ databases: [], facets })
      }),
    )

    const { result } = renderHook(() => useSidebarFacets(null, "", null, BASE), { wrapper: wrapper() })

    await waitFor(() => expect(result.current.facets).not.toBeNull())
    expect((captured as unknown as URL).searchParams.get("facets")).toBe("organism,accessibility")
  })

  test("warmPlaceholder_shownImmediately_thenReplacedByAccurateCounts", async () => {
    const placeholder = { accessibility: [{ value: "controlled-access", count: 1 }] }
    server.use(http.get(DB_URL, () => HttpResponse.json({ hits: [], count: 0, facets })))

    const { result } = renderHook(
      () => useSidebarFacets("sra", "", placeholder, BASE),
      { wrapper: wrapper() },
    )

    // The placeholder renders right away (no loading flash, rows kept).
    expect(result.current.facets).toEqual(placeholder)
    expect(result.current.loading).toBe(false)
    // The accurate counts replace it once the request resolves.
    await waitFor(() => expect(result.current.facets).toEqual(facets))
  })

  test("coldNoPlaceholder_loadingUntilResolved", async () => {
    server.use(http.get(CROSS_URL, () => HttpResponse.json({ databases: [], facets })))

    const { result } = renderHook(() => useSidebarFacets(null, "", null, BASE), { wrapper: wrapper() })

    // No placeholder: the sidebar holds the rows via `loading` until buckets land.
    expect(result.current.loading).toBe(true)
    await waitFor(() => expect(result.current.facets).not.toBeNull())
    expect(result.current.loading).toBe(false)
  })
})
