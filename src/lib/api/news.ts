import { useQuery, type UseQueryOptions } from "@tanstack/react-query"

import type { Lang } from "@/i18n"
import type { MirroredNewsItem, NewsFacets, NewsQueryResult, NewsType } from "@/server/news-mirror"

export interface NewsClientQuery {
  lang?: Lang
  db?: string[]
  tag?: string[]
  year?: string
  type?: NewsType
  retired?: "0" | "1" | "all"
  limit?: number
  cursor?: string | null
}

export const buildNewsSearch = (query: NewsClientQuery): string => {
  const sp = new URLSearchParams()
  if (query.lang) sp.set("lang", query.lang)
  if (query.db && query.db.length > 0) sp.set("db", query.db.join(","))
  if (query.tag && query.tag.length > 0) sp.set("tag", query.tag.join(","))
  if (query.year) sp.set("year", query.year)
  if (query.type) sp.set("type", query.type)
  if (query.retired) sp.set("retired", query.retired)
  if (query.limit !== undefined) sp.set("limit", String(query.limit))
  if (query.cursor) sp.set("cursor", query.cursor)
  const qs = sp.toString()

  return qs.length > 0 ? `?${qs}` : ""
}

export const fetchNews = async (query: NewsClientQuery, signal?: AbortSignal): Promise<NewsQueryResult> => {
  const init: RequestInit = { method: "GET", headers: { Accept: "application/json" } }
  if (signal) init.signal = signal
  const res = await fetch(`/api/news${buildNewsSearch(query)}`, init)
  if (!res.ok) throw new Error(`news api ${res.status}`)

  return await res.json() as NewsQueryResult
}

export const useNewsQuery = (
  query: NewsClientQuery,
  options?: Partial<UseQueryOptions<NewsQueryResult>>,
) =>
  useQuery<NewsQueryResult>({
    queryKey: ["news", query],
    queryFn: ({ signal }) => fetchNews(query, signal),
    ...options,
  })

export type { MirroredNewsItem, NewsFacets, NewsQueryResult, NewsType }
