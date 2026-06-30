import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import {
  fetchServices,
  type ServiceCategory,
  ServiceCategory as ServiceCategorySchema,
  type ServiceItem,
  type ServiceList,
  serviceName,
  SERVICES_QUERY_KEY,
  type ServiceSource,
  ServiceSource as ServiceSourceSchema,
} from "~/lib/api"
import type { Lang } from "~/lib/i18n/use-lang"

import { type ServicesFacetState } from "./facet-url-state"

const PAGE_SIZE = 20

const matchesSource = (item: ServiceItem, facet: ServicesFacetState): boolean =>
  facet.source.length === 0 || facet.source.includes(item.source)

const matchesCategory = (item: ServiceItem, facet: ServicesFacetState): boolean =>
  facet.category.length === 0 || facet.category.some((c) => item.categories.includes(c))

const applyFilter = (items: ServiceList, facet: ServicesFacetState): ServiceList =>
  items.filter((item) => matchesSource(item, facet) && matchesCategory(item, facet))

const sortItems = (items: ServiceList, lang: Lang, sort: ServicesFacetState["sort"]): ServiceList => {
  const sorted = [...items]
  sorted.sort((a, b) => {
    const byName = serviceName(a, lang).localeCompare(serviceName(b, lang), "en", {
      sensitivity: "base",
    })
    const cmp = byName !== 0 ? byName : a.id.localeCompare(b.id)

    return sort === "asc" ? cmp : -cmp
  })

  return sorted
}

export type ServicesFacetOptions = {
  categories: readonly ServiceCategory[]
  sources: readonly ServiceSource[]
}

const collectOptions = (items: ServiceList): ServicesFacetOptions => {
  const categories = new Set<ServiceCategory>()
  const sources = new Set<ServiceSource>()
  for (const item of items) {
    for (const category of item.categories) categories.add(category)
    sources.add(item.source)
  }

  return {
    categories: ServiceCategorySchema.options.filter((c) => categories.has(c)),
    sources: ServiceSourceSchema.options.filter((s) => sources.has(s)),
  }
}

export type ServicesFacetCounts = {
  source: Readonly<Record<string, number>>
  category: Readonly<Record<string, number>>
}

const bump = (record: Record<string, number>, key: string): void => {
  record[key] = (record[key] ?? 0) + 1
}

export const collectServicesFacetCounts = (
  items: ServiceList,
  facet: ServicesFacetState,
): ServicesFacetCounts => {
  const source: Record<string, number> = {}
  const category: Record<string, number> = {}
  for (const item of items) {
    if (matchesCategory(item, facet)) bump(source, item.source)
    if (matchesSource(item, facet)) {
      for (const c of item.categories) bump(category, c)
    }
  }

  return { source, category }
}

const paginate = (items: ServiceList, page: number): { items: ServiceItem[]; totalPages: number } => {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * PAGE_SIZE

  return { items: items.slice(start, start + PAGE_SIZE), totalPages }
}

type UseServicesListResult = {
  loading: boolean
  error: boolean
  total: number
  visibleItems: ServiceItem[]
  totalPages: number
  options: ServicesFacetOptions
  counts: ServicesFacetCounts
}

export const SERVICES_PAGE_SIZE = PAGE_SIZE

export const useServicesList = (lang: Lang, facet: ServicesFacetState): UseServicesListResult => {
  const query = useQuery({
    queryKey: SERVICES_QUERY_KEY,
    queryFn: () => fetchServices(),
    staleTime: 5 * 60_000,
  })
  const all = useMemo<ServiceList>(() => query.data ?? [], [query.data])
  const filtered = useMemo(() => applyFilter(all, facet), [all, facet])
  const sorted = useMemo(() => sortItems(filtered, lang, facet.sort), [filtered, lang, facet.sort])
  const page = useMemo(() => paginate(sorted, facet.page), [sorted, facet.page])
  const options = useMemo(() => collectOptions(all), [all])
  const counts = useMemo(() => collectServicesFacetCounts(all, facet), [all, facet])

  return {
    loading: query.isLoading,
    error: query.isError,
    total: sorted.length,
    visibleItems: page.items,
    totalPages: page.totalPages,
    options,
    counts,
  }
}
