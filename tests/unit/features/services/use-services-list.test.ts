import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { createElement, type ReactNode } from "react"
import { describe, expect, test } from "vitest"

import {
  emptyServicesFacetState,
  type ServicesFacetState,
  useServicesList,
} from "~/features/services"
import type { Lang } from "~/lib/i18n/use-lang"
import type { ServiceItem } from "~/schemas/api-bff/service"

import { servicesList } from "../../mocks/handlers"
import { server } from "../../mocks/server"

const buildItem = (overrides: Partial<ServiceItem> = {}): ServiceItem => ({
  id: "id",
  source: "ddbj",
  name: { ja: "名前", en: "Name" },
  description: { ja: "", en: "" },
  categories: [],
  rawCategories: [],
  featuredTop: false,
  ...overrides,
})

const named = (id: string, en: string, overrides: Partial<ServiceItem> = {}): ServiceItem =>
  buildItem({ id, name: { ja: en, en }, ...overrides })

const facetWith = (overrides: Partial<ServicesFacetState>): ServicesFacetState => ({
  ...emptyServicesFacetState(),
  ...overrides,
})

const wrapper = () => {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })

  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client }, children)
}

// Drives the real useServicesList hook against an msw-stubbed /api/services
// boundary and resolves once react-query has loaded the crafted items.
const loadList = async (items: ServiceItem[], facet: ServicesFacetState, lang: Lang = "en") => {
  server.use(servicesList(items))
  const { result } = renderHook(() => useServicesList(lang, facet), { wrapper: wrapper() })
  await waitFor(() => expect(result.current.loading).toBe(false))

  return result
}

const visibleNames = (result: { current: { visibleItems: ServiceItem[] } }, lang: Lang = "en") =>
  result.current.visibleItems.map((item) => item.name[lang])

const visibleIds = (result: { current: { visibleItems: ServiceItem[] } }) =>
  result.current.visibleItems.map((item) => item.id)

describe("useServicesList sortItems", () => {
  test("sortItems_asc_ordersByNameCaseInsensitively", async () => {
    const items = [named("a", "Zebra"), named("b", "apple"), named("c", "Mango")]
    const result = await loadList(items, facetWith({ sort: "asc" }))
    expect(visibleNames(result)).toEqual(["apple", "Mango", "Zebra"])
  })

  test("sortItems_mixedCase_treatsCaseAsEqualForNameComparison", async () => {
    // sensitivity:"base" makes "alpha" and "ALPHA" compare equal on name,
    // so the stable order between them is decided by the id tie-break.
    const items = [named("z", "ALPHA"), named("a", "alpha")]
    const result = await loadList(items, facetWith({ sort: "asc" }))
    expect(visibleNames(result)).toEqual(["alpha", "ALPHA"])
    expect(visibleIds(result)).toEqual(["a", "z"])
  })

  test("sortItems_sameName_breaksTieByIdAscending", async () => {
    const items = [named("c", "Genome"), named("a", "Genome"), named("b", "Genome")]
    const result = await loadList(items, facetWith({ sort: "asc" }))
    expect(visibleIds(result)).toEqual(["a", "b", "c"])
  })

  test("sortItems_desc_reversesBothNameAndIdTieBreak", async () => {
    const items = [named("a", "Genome"), named("b", "Genome"), named("c", "Beta")]
    const result = await loadList(items, facetWith({ sort: "desc" }))
    // desc negates the comparator, so same-name ids run high-to-low and the
    // alphabetically-later name leads.
    expect(visibleNames(result)).toEqual(["Genome", "Genome", "Beta"])
    expect(visibleIds(result)).toEqual(["b", "a", "c"])
  })

  test("sortItems_perLangName_usesRequestedLanguage", async () => {
    const items = [
      buildItem({ id: "x", name: { ja: "あ", en: "Zoo" } }),
      buildItem({ id: "y", name: { ja: "ん", en: "Ant" } }),
    ]
    const enResult = await loadList(items, facetWith({ sort: "asc" }), "en")
    expect(visibleIds(enResult)).toEqual(["y", "x"])
  })

  test("sortItems_doesNotMutateInputOrder_returnsSortedCopy", async () => {
    const items = [named("c", "Cee"), named("a", "Aye"), named("b", "Bee")]
    const result = await loadList(items, facetWith({ sort: "asc" }))
    expect(visibleIds(result)).toEqual(["a", "b", "c"])
    // The crafted array handed to the boundary keeps its original order.
    expect(items.map((i) => i.id)).toEqual(["c", "a", "b"])
  })
})

describe("useServicesList paginate", () => {
  const sequential = (count: number): ServiceItem[] =>
    Array.from({ length: count }, (_, i) => {
      const n = String(i + 1).padStart(3, "0")

      return named(`id-${n}`, `Svc ${n}`)
    })

  test("paginate_twentyItems_isSinglePage", async () => {
    const result = await loadList(sequential(20), facetWith({ page: 1 }))
    expect(result.current.total).toBe(20)
    expect(result.current.totalPages).toBe(1)
    expect(result.current.visibleItems).toHaveLength(20)
  })

  test("paginate_twentyOneItems_splitsIntoTwoPagesWithRemainderOnLast", async () => {
    const firstPage = await loadList(sequential(21), facetWith({ page: 1 }))
    expect(firstPage.current.totalPages).toBe(2)
    expect(firstPage.current.visibleItems).toHaveLength(20)
    expect(visibleIds(firstPage)[0]).toBe("id-001")

    const secondPage = await loadList(sequential(21), facetWith({ page: 2 }))
    expect(secondPage.current.visibleItems).toHaveLength(1)
    expect(visibleIds(secondPage)).toEqual(["id-021"])
  })

  test("paginate_emptyList_keepsOnePageAndNoItems", async () => {
    const result = await loadList([], facetWith({ page: 1 }))
    expect(result.current.total).toBe(0)
    expect(result.current.totalPages).toBe(1)
    expect(result.current.visibleItems).toEqual([])
  })

  test("paginate_pageBeyondLast_clampsToLastPage", async () => {
    const result = await loadList(sequential(21), facetWith({ page: 999 }))
    expect(result.current.totalPages).toBe(2)
    // page 999 clamps to the last page (page 2), which holds the remainder.
    expect(visibleIds(result)).toEqual(["id-021"])
  })

  test("paginate_pageBelowOne_clampsToFirstPage", async () => {
    const result = await loadList(sequential(21), facetWith({ page: -5 }))
    expect(result.current.totalPages).toBe(2)
    expect(visibleIds(result)[0]).toBe("id-001")
    expect(result.current.visibleItems).toHaveLength(20)
  })

  test("paginate_pageBeyondLastOnEmptyList_clampsToTheOnlyPage", async () => {
    const result = await loadList([], facetWith({ page: 999 }))
    expect(result.current.totalPages).toBe(1)
    expect(result.current.visibleItems).toEqual([])
  })

  test("paginate_fortyItems_isExactlyTwoFullPages", async () => {
    const first = await loadList(sequential(40), facetWith({ page: 1 }))
    expect(first.current.totalPages).toBe(2)
    expect(first.current.visibleItems).toHaveLength(20)

    const second = await loadList(sequential(40), facetWith({ page: 2 }))
    expect(second.current.visibleItems).toHaveLength(20)
    expect(visibleIds(second)).toEqual([...Array(20)].map((_, i) => `id-${String(i + 21).padStart(3, "0")}`))
  })
})

describe("useServicesList collectOptions", () => {
  test("collectOptions_returnsCategoriesInEnumOrderNotInsertionOrder", async () => {
    // Items introduce categories in a scrambled order; options must follow the
    // ServiceCategory enum order (repository, search, analysis, ...).
    const items = [
      buildItem({ id: "a", source: "dbcls", categories: ["other", "analysis"] }),
      buildItem({ id: "b", source: "ddbj", categories: ["repository", "search"] }),
    ]
    const result = await loadList(items, emptyServicesFacetState())
    expect(result.current.options.categories).toEqual([
      "repository",
      "search",
      "analysis",
      "other",
    ])
  })

  test("collectOptions_returnsSourcesInEnumOrder", async () => {
    const items = [
      buildItem({ id: "a", source: "dbcls", categories: ["search"] }),
      buildItem({ id: "b", source: "ddbj", categories: ["search"] }),
    ]
    const result = await loadList(items, emptyServicesFacetState())
    expect(result.current.options.sources).toEqual(["ddbj", "dbcls"])
  })

  test("collectOptions_onlyIncludesValuesPresentInItems", async () => {
    const items = [buildItem({ id: "a", source: "ddbj", categories: ["search"] })]
    const result = await loadList(items, emptyServicesFacetState())
    expect(result.current.options.categories).toEqual(["search"])
    expect(result.current.options.sources).toEqual(["ddbj"])
  })

  test("collectOptions_deduplicatesRepeatedValues", async () => {
    const items = [
      buildItem({ id: "a", source: "ddbj", categories: ["search", "repository"] }),
      buildItem({ id: "b", source: "ddbj", categories: ["search"] }),
    ]
    const result = await loadList(items, emptyServicesFacetState())
    expect(result.current.options.categories).toEqual(["repository", "search"])
    expect(result.current.options.sources).toEqual(["ddbj"])
  })

  test("collectOptions_emptyList_returnsEmptyOptionArrays", async () => {
    const result = await loadList([], emptyServicesFacetState())
    expect(result.current.options.categories).toEqual([])
    expect(result.current.options.sources).toEqual([])
  })

  test("collectOptions_ignoresActiveFacetFilter_reflectsWholeDataset", async () => {
    // options describe what can be chosen, so they come from the full dataset
    // even when a facet is already filtering visible items.
    const items = [
      buildItem({ id: "a", source: "ddbj", categories: ["repository"] }),
      buildItem({ id: "b", source: "dbcls", categories: ["analysis"] }),
    ]
    const result = await loadList(items, facetWith({ source: ["ddbj"] }))
    expect(result.current.options.sources).toEqual(["ddbj", "dbcls"])
    expect(result.current.options.categories).toEqual(["repository", "analysis"])
  })
})
