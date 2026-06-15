import { z } from "zod"

export const NewsCategory = z.enum([
  "announcement",
  "data-release",
  "maintenance",
  "event",
  "service",
  "other",
])
export type NewsCategory = z.infer<typeof NewsCategory>

export const NewsSource = z.enum(["ddbj", "dbcls"])
export type NewsSource = z.infer<typeof NewsSource>

const langString = z.object({
  ja: z.string(),
  en: z.string(),
})

const langOptionalUrl = z.object({
  ja: z.string().url().optional(),
  en: z.string().url().optional(),
})

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

// Bump when the cache shape changes; the server rebuilds caches whose stored
// schemaVersion no longer matches. Single source for both the schema literal and
// the writer (server/news/cache.ts).
export const NEWS_CACHE_SCHEMA_VERSION = 4

export const NewsCache = z.object({
  schemaVersion: z.literal(NEWS_CACHE_SCHEMA_VERSION),
  lastSyncSha: z.record(NewsSource, z.string().nullable()),
  lastFetchedAt: z.string().datetime({ offset: true }),
  items: NewsList,
})
export type NewsCache = z.infer<typeof NewsCache>
