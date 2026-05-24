import { z } from "zod"

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
