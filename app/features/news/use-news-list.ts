import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import { fetchNews, type NewsItem, type NewsList } from "~/lib/api"
import type { Lang } from "~/lib/i18n/use-lang"

import { type NewsFacetState } from "./facet-url-state"

const PAGE_SIZE = 20

const sortItems = (items: NewsList, sort: NewsFacetState["sort"]): NewsList => {
  const sorted = [...items]
  sorted.sort((a, b) =>
    sort === "newest"
      ? b.publishedAt.localeCompare(a.publishedAt)
      : a.publishedAt.localeCompare(b.publishedAt),
  )

  return sorted
}

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

const applyFilter = (items: NewsList, lang: Lang, facet: NewsFacetState): NewsList =>
  items.filter((item) =>
    hasTitle(item, lang)
    && matchesSource(item, facet)
    && matchesCategory(item, facet)
    && matchesYear(item, facet)
    && matchesService(item, facet),
  )

export type NewsFacetOptions = {
  years: readonly number[]
  services: readonly string[]
}

const collectOptions = (items: NewsList, lang: Lang): NewsFacetOptions => {
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

const bump = (record: Record<string, number>, key: string | number): void => {
  record[key] = (record[key] ?? 0) + 1
}

export const collectNewsFacetCounts = (
  items: NewsList,
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

const paginate = (items: NewsList, page: number): { items: NewsItem[]; totalPages: number } => {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * PAGE_SIZE

  return { items: items.slice(start, start + PAGE_SIZE), totalPages }
}

type UseNewsListResult = {
  loading: boolean
  error: boolean
  total: number
  visibleItems: NewsItem[]
  totalPages: number
  options: NewsFacetOptions
  counts: NewsFacetCounts
}

export const NEWS_PAGE_SIZE = PAGE_SIZE

export const useNewsList = (lang: Lang, facet: NewsFacetState): UseNewsListResult => {
  const query = useQuery({
    queryKey: ["news"],
    queryFn: () => fetchNews(),
    staleTime: 5 * 60_000,
  })
  const all = useMemo<NewsList>(() => query.data ?? [], [query.data])
  const filtered = useMemo(() => applyFilter(all, lang, facet), [all, lang, facet])
  const sorted = useMemo(() => sortItems(filtered, facet.sort), [filtered, facet.sort])
  const page = useMemo(() => paginate(sorted, facet.page), [sorted, facet.page])
  const options = useMemo(() => collectOptions(all, lang), [all, lang])
  const counts = useMemo(() => collectNewsFacetCounts(all, lang, facet), [all, lang, facet])

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
