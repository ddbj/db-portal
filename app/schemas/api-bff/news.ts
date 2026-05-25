import { z } from "zod"

export const NewsCategory = z.enum([
  "announcement",
  "release",
  "maintenance",
  "event",
  "news",
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
  publishedAt: z.string().datetime({ offset: true }),
  retireTime: z.string().datetime({ offset: true }).optional(),
  title: langString,
  summary: langString.optional(),
  url: langOptionalUrl.optional(),
  db: z.array(z.string()).default([]),
  rawTags: langRawTags,
})
export type NewsItem = z.infer<typeof NewsItem>

export const NewsList = z.array(NewsItem)
export type NewsList = z.infer<typeof NewsList>

const LangSha = z.object({
  ja: z.string().nullable(),
  en: z.string().nullable(),
})

export const NewsCache = z.object({
  schemaVersion: z.literal(2),
  lastCommitSha: z.record(NewsSource, LangSha),
  lastFetchedAt: z.string().datetime({ offset: true }),
  items: NewsList,
})
export type NewsCache = z.infer<typeof NewsCache>
