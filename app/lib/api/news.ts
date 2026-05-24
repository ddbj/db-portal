import { type NewsItem, NewsList } from "~/schemas/api-bff/news"

import type { Lang } from "../i18n/use-lang"
import { buildRequestInit, joinUrl } from "./client"
import { toAPIError } from "./errors"

export { NewsCategory, NewsItem, NewsList } from "~/schemas/api-bff/news"

export const newsItemTitle = (item: NewsItem, lang: Lang): string =>
  item.title[lang] || item.title.ja

const NEWS_PATH = "/api/news"

export type FetchNewsOptions = {
  baseUrl?: string
  signal?: AbortSignal
  headers?: HeadersInit
}

export const fetchNews = async (options: FetchNewsOptions = {}): Promise<NewsList> => {
  const init = buildRequestInit({
    method: "GET",
    baseUrl: options.baseUrl,
    signal: options.signal,
    headers: options.headers,
  })
  const response = await fetch(joinUrl(options.baseUrl, NEWS_PATH), init)
  if (!response.ok) throw await toAPIError(response)

  return NewsList.parse(await response.json())
}
