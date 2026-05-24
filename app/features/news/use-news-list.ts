import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import { fetchNews, type NewsItem, type NewsList } from "~/lib/api"
import type { Lang } from "~/lib/i18n/use-lang"

import { type FacetState } from "./facet-url-state"

const PAGE_SIZE = 20

const sortItems = (items: NewsList, sort: FacetState["sort"]): NewsList => {
  const sorted = [...items]
  sorted.sort((a, b) =>
    sort === "newest"
      ? b.publishedAt.localeCompare(a.publishedAt)
      : a.publishedAt.localeCompare(b.publishedAt),
  )

  return sorted
}

const applyFilter = (items: NewsList, lang: Lang, facet: FacetState): NewsList =>
  items.filter((item) => {
    const title = item.title[lang]
    if (!title || title.trim() === "") return false
    if (facet.category.length > 0 && !facet.category.includes(item.category)) return false
    if (facet.year.length > 0) {
      const year = Number(item.publishedAt.slice(0, 4))
      if (!facet.year.includes(year)) return false
    }
    if (facet.service.length > 0) {
      if (!facet.service.some((s) => item.db.includes(s))) return false
    }

    return true
  })

export type NewsFacetOptions = {
  years: readonly number[]
  services: readonly string[]
}

const collectOptions = (items: NewsList, lang: Lang): NewsFacetOptions => {
  const years = new Set<number>()
  const services = new Set<string>()
  for (const item of items) {
    const title = item.title[lang]
    if (!title || title.trim() === "") continue
    const year = Number(item.publishedAt.slice(0, 4))
    if (Number.isInteger(year)) years.add(year)
    for (const db of item.db) services.add(db)
  }

  return {
    years: [...years].sort((a, b) => b - a),
    services: [...services].sort(),
  }
}

const paginate = (items: NewsList, page: number): { items: NewsItem[]; totalPages: number } => {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * PAGE_SIZE

  return { items: items.slice(start, start + PAGE_SIZE), totalPages }
}

export type UseNewsListResult = {
  loading: boolean
  error: boolean
  total: number
  visibleItems: NewsItem[]
  totalPages: number
  options: NewsFacetOptions
}

export const NEWS_PAGE_SIZE = PAGE_SIZE

export const useNewsList = (lang: Lang, facet: FacetState): UseNewsListResult => {
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

  return {
    loading: query.isLoading,
    error: query.isError,
    total: sorted.length,
    visibleItems: page.items,
    totalPages: page.totalPages,
    options,
  }
}
