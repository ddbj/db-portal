import { type NewsItem, NewsList } from "~/schemas/api-bff/news"

import type { Lang } from "../i18n/use-lang"
import { buildRequestInit, joinUrl } from "./client"
import { toAPIError } from "./errors"

export {
  NewsCache,
  NewsCategory,
  NewsItem,
  NewsList,
} from "~/schemas/api-bff/news"

export const newsItemTitle = (item: NewsItem, lang: Lang): string =>
  item.title[lang] || item.title.ja

export const newsItemSummary = (item: NewsItem, lang: Lang): string | undefined => {
  if (!item.summary) return undefined
  const picked = item.summary[lang]
  if (picked) return picked

  return item.summary.ja || item.summary.en || undefined
}

export const newsItemUrl = (item: NewsItem, lang: Lang): string | undefined => {
  if (!item.url) return undefined

  return item.url[lang] ?? item.url.ja ?? item.url.en
}

export type FetchNewsQuery = {
  lang?: Lang
  category?: readonly string[]
  year?: readonly number[]
  service?: readonly string[]
}

const buildNewsPath = (query: FetchNewsQuery | undefined): string => {
  const base = "/api/news"
  if (!query) return base
  const params = new URLSearchParams()
  if (query.lang) params.set("lang", query.lang)
  if (query.category && query.category.length > 0) {
    params.set("category", [...query.category].sort().join(","))
  }
  if (query.year && query.year.length > 0) {
    params.set("year", [...query.year].map(String).sort().join(","))
  }
  if (query.service && query.service.length > 0) {
    params.set("service", [...query.service].sort().join(","))
  }
  const qs = params.toString()

  return qs ? `${base}?${qs}` : base
}

export type FetchNewsOptions = {
  baseUrl?: string
  signal?: AbortSignal
  headers?: HeadersInit
  query?: FetchNewsQuery
}

export const fetchNews = async (options: FetchNewsOptions = {}): Promise<NewsList> => {
  const init = buildRequestInit({
    method: "GET",
    baseUrl: options.baseUrl,
    signal: options.signal,
    headers: options.headers,
  })
  const response = await fetch(joinUrl(options.baseUrl, buildNewsPath(options.query)), init)
  if (!response.ok) throw await toAPIError(response)

  return NewsList.parse(await response.json())
}
