import { z } from "zod"

import { joinUrl } from "./client"
import { toAPIError } from "./errors"

export const NewsCategory = z.enum([
  "announcement",
  "release",
  "maintenance",
  "event",
  "news",
])
export type NewsCategory = z.infer<typeof NewsCategory>

export const NewsItem = z.object({
  id: z.string().min(1),
  source: z.literal("ddbj"),
  category: NewsCategory,
  publishedAt: z.string().datetime(),
  title: z.object({
    ja: z.string(),
    en: z.string(),
  }),
  summary: z.object({
    ja: z.string(),
    en: z.string(),
  }).optional(),
  url: z.string().url().optional(),
})
export type NewsItem = z.infer<typeof NewsItem>

export const NewsList = z.array(NewsItem)
export type NewsList = z.infer<typeof NewsList>

const NEWS_PATH = "/api/news"

export type FetchNewsOptions = {
  baseUrl?: string
  signal?: AbortSignal
  headers?: HeadersInit
}

export const fetchNews = async (options: FetchNewsOptions = {}): Promise<NewsList> => {
  const response = await fetch(joinUrl(options.baseUrl, NEWS_PATH), {
    method: "GET",
    headers: { Accept: "application/json", ...options.headers },
    credentials: options.baseUrl ? "same-origin" : "include",
    signal: options.signal ?? null,
  })
  if (!response.ok) throw await toAPIError(response)

  return NewsList.parse(await response.json())
}
