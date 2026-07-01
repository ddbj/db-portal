import { useQuery } from "@tanstack/react-query"
import { useMemo } from "react"

import type { Lang } from "../i18n/use-lang"

export type EntityListConfig<TItem, TFacet, TOptions, TCounts> = {
  queryKey: readonly unknown[]
  queryFn: () => Promise<TItem[]>
  staleTime?: number
  pageSize?: number
  filter: (items: TItem[], lang: Lang, facet: TFacet) => TItem[]
  sort: (items: TItem[], lang: Lang, facet: TFacet) => TItem[]
  collectOptions: (items: TItem[], lang: Lang) => TOptions
  collectCounts: (items: TItem[], lang: Lang, facet: TFacet) => TCounts
  getPage: (facet: TFacet) => number
}

export type EntityListResult<TItem, TOptions, TCounts> = {
  loading: boolean
  error: boolean
  total: number
  visibleItems: TItem[]
  totalPages: number
  options: TOptions
  counts: TCounts
}

const DEFAULT_PAGE_SIZE = 20

const paginate = <T>(
  items: T[],
  page: number,
  pageSize: number,
): { items: T[]; totalPages: number } => {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(Math.max(1, page), totalPages)
  const start = (safePage - 1) * pageSize

  return { items: items.slice(start, start + pageSize), totalPages }
}

export const bump = (record: Record<string, number>, key: string | number): void => {
  record[key] = (record[key] ?? 0) + 1
}

export const useEntityList = <TItem, TFacet, TOptions, TCounts>(
  lang: Lang,
  facet: TFacet,
  config: EntityListConfig<TItem, TFacet, TOptions, TCounts>,
): EntityListResult<TItem, TOptions, TCounts> => {
  const pageSize = config.pageSize ?? DEFAULT_PAGE_SIZE
  const query = useQuery({
    queryKey: config.queryKey,
    queryFn: config.queryFn,
    ...(config.staleTime !== undefined && { staleTime: config.staleTime }),
  })
  const { filter, sort, getPage, collectOptions, collectCounts } = config
  const all = useMemo<TItem[]>(() => query.data ?? [], [query.data])
  const filtered = useMemo(() => filter(all, lang, facet), [all, lang, facet, filter])
  const sorted = useMemo(() => sort(filtered, lang, facet), [filtered, lang, facet, sort])
  const page = useMemo(
    () => paginate(sorted, getPage(facet), pageSize),
    [sorted, facet, pageSize, getPage],
  )
  const options = useMemo(() => collectOptions(all, lang), [all, lang, collectOptions])
  const counts = useMemo(() => collectCounts(all, lang, facet), [all, lang, facet, collectCounts])

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
