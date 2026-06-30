import { z } from "zod"

import { BsiSource, cacheWrapper, langOptionalUrl, langString } from "./_shared"

export const NewsCategory = z.enum([
  "announcement",
  "data-release",
  "maintenance",
  "event",
  "service",
  "other",
])
export type NewsCategory = z.infer<typeof NewsCategory>

export const NewsSource = BsiSource
export type NewsSource = z.infer<typeof NewsSource>

const langRawTags = z.object({
  ja: z.array(z.string()).default([]),
  en: z.array(z.string()).default([]),
})

export const NewsItem = z.object({
  id: z.string().min(1),
  source: NewsSource,
  category: NewsCategory,
  featured: z.boolean().default(false),
  publishedAt: z.string().datetime({ offset: true }),
  title: langString,
  summary: langString.optional(),
  url: langOptionalUrl.optional(),
  db: z.array(z.string()).default([]),
  rawTags: langRawTags,
})
export type NewsItem = z.infer<typeof NewsItem>

export const NewsList = z.array(NewsItem)
export type NewsList = z.infer<typeof NewsList>

export const NEWS_CACHE_SCHEMA_VERSION = 4

export const NewsCache = cacheWrapper(NewsList, NEWS_CACHE_SCHEMA_VERSION)
export type NewsCache = z.infer<typeof NewsCache>
