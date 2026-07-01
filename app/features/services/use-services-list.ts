import {
  fetchServices,
  type ServiceCategory,
  ServiceCategory as ServiceCategorySchema,
  type ServiceItem,
  serviceName,
  SERVICES_QUERY_KEY,
  type ServiceSource,
  ServiceSource as ServiceSourceSchema,
} from "~/lib/api"
import { bump, type EntityListConfig, useEntityList } from "~/lib/entity-list/use-entity-list"
import type { Lang } from "~/lib/i18n/use-lang"

import { type ServicesFacetState } from "./facet-url-state"

const PAGE_SIZE = 20
export const SERVICES_PAGE_SIZE = PAGE_SIZE

const matchesSource = (item: ServiceItem, facet: ServicesFacetState): boolean =>
  facet.source.length === 0 || facet.source.includes(item.source)

const matchesCategory = (item: ServiceItem, facet: ServicesFacetState): boolean =>
  facet.category.length === 0 || facet.category.some((c) => item.categories.includes(c))

const applyFilter = (items: ServiceItem[], _lang: Lang, facet: ServicesFacetState): ServiceItem[] =>
  items.filter((item) => matchesSource(item, facet) && matchesCategory(item, facet))

export const sortItems = (items: ServiceItem[], lang: Lang, facet: ServicesFacetState): ServiceItem[] => {
  const sorted = [...items]
  sorted.sort((a, b) => {
    const byName = serviceName(a, lang).localeCompare(serviceName(b, lang), "en", {
      sensitivity: "base",
    })
    const cmp = byName !== 0 ? byName : a.id.localeCompare(b.id)

    return facet.sort === "asc" ? cmp : -cmp
  })

  return sorted
}

export type ServicesFacetOptions = {
  categories: readonly ServiceCategory[]
  sources: readonly ServiceSource[]
}

const collectOptionsImpl = (items: ServiceItem[]): ServicesFacetOptions => {
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

export const collectServicesFacetCounts = (
  items: ServiceItem[],
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

const CONFIG: EntityListConfig<ServiceItem, ServicesFacetState, ServicesFacetOptions, ServicesFacetCounts> = {
  queryKey: SERVICES_QUERY_KEY,
  queryFn: () => fetchServices(),
  staleTime: 5 * 60_000,
  pageSize: PAGE_SIZE,
  filter: applyFilter,
  sort: sortItems,
  collectOptions: (items, _lang) => collectOptionsImpl(items),
  collectCounts: (items, _lang, facet) => collectServicesFacetCounts(items, facet),
  getPage: (facet) => facet.page,
}

export const useServicesList = (lang: Lang, facet: ServicesFacetState) =>
  useEntityList(lang, facet, CONFIG)
