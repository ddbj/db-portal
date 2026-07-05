import { fetchNews, NEWS_QUERY_KEY, type NewsItem } from "~/lib/api"
import { bump, type EntityListConfig, useEntityList } from "~/lib/entity-list/use-entity-list"
import type { Lang } from "~/lib/i18n/use-lang"

import { type NewsFacetState } from "./facet-url-state"

const PAGE_SIZE = 20
export const NEWS_PAGE_SIZE = PAGE_SIZE

const itemYear = (item: NewsItem): number => Number(item.publishedAt.slice(0, 4))

const hasTitle = (item: NewsItem, lang: Lang): boolean => {
  const title = item.title[lang]

  return title !== undefined && title.trim() !== ""
}

const matchesSource = (item: NewsItem, facet: NewsFacetState): boolean =>
  facet.source.length === 0 || facet.source.includes(item.source)

const matchesCategory = (item: NewsItem, facet: NewsFacetState): boolean =>
  facet.category.length === 0 || facet.category.includes(item.category)

const matchesYear = (item: NewsItem, facet: NewsFacetState): boolean =>
  facet.year.length === 0 || facet.year.includes(itemYear(item))

const matchesService = (item: NewsItem, facet: NewsFacetState): boolean =>
  facet.service.length === 0 || facet.service.some((s) => item.db.includes(s))

const applyFilter = (items: NewsItem[], lang: Lang, facet: NewsFacetState): NewsItem[] =>
  items.filter((item) =>
    hasTitle(item, lang)
    && matchesSource(item, facet)
    && matchesCategory(item, facet)
    && matchesYear(item, facet)
    && matchesService(item, facet),
  )

const sortItems = (items: NewsItem[], _lang: Lang, facet: NewsFacetState): NewsItem[] => {
  const sorted = [...items]
  sorted.sort((a, b) =>
    facet.sort === "newest"
      ? b.publishedAt.localeCompare(a.publishedAt)
      : a.publishedAt.localeCompare(b.publishedAt),
  )

  return sorted
}

export type NewsFacetOptions = {
  years: readonly number[]
  services: readonly string[]
}

const collectOptions = (items: NewsItem[], lang: Lang): NewsFacetOptions => {
  const years = new Set<number>()
  const services = new Set<string>()
  for (const item of items) {
    if (!hasTitle(item, lang)) continue
    const year = itemYear(item)
    if (Number.isInteger(year)) years.add(year)
    for (const db of item.db) services.add(db)
  }

  return {
    years: [...years].sort((a, b) => b - a),
    services: [...services].sort(),
  }
}

export type NewsFacetCounts = {
  source: Readonly<Record<string, number>>
  category: Readonly<Record<string, number>>
  year: Readonly<Record<number, number>>
  service: Readonly<Record<string, number>>
}

export const collectNewsFacetCounts = (
  items: NewsItem[],
  lang: Lang,
  facet: NewsFacetState,
): NewsFacetCounts => {
  const source: Record<string, number> = {}
  const category: Record<string, number> = {}
  const year: Record<number, number> = {}
  const service: Record<string, number> = {}
  for (const item of items) {
    if (!hasTitle(item, lang)) continue
    if (matchesCategory(item, facet) && matchesYear(item, facet) && matchesService(item, facet)) {
      bump(source, item.source)
    }
    if (matchesSource(item, facet) && matchesYear(item, facet) && matchesService(item, facet)) {
      bump(category, item.category)
    }
    if (matchesSource(item, facet) && matchesCategory(item, facet) && matchesService(item, facet)) {
      const y = itemYear(item)
      if (Number.isInteger(y)) bump(year, y)
    }
    if (matchesSource(item, facet) && matchesCategory(item, facet) && matchesYear(item, facet)) {
      for (const db of item.db) bump(service, db)
    }
  }

  return { source, category, year, service }
}

const CONFIG: EntityListConfig<NewsItem, NewsFacetState, NewsFacetOptions, NewsFacetCounts> = {
  queryKey: NEWS_QUERY_KEY,
  queryFn: () => fetchNews(),
  staleTime: 5 * 60_000,
  pageSize: PAGE_SIZE,
  filter: applyFilter,
  sort: sortItems,
  collectOptions,
  collectCounts: collectNewsFacetCounts,
  getPage: (facet) => facet.page,
}

export const useNewsList = (lang: Lang, facet: NewsFacetState) =>
  useEntityList(lang, facet, CONFIG)
