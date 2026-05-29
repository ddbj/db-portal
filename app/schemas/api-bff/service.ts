import { z } from "zod"

export const ServiceCategory = z.enum([
  "repository",
  "search",
  "analysis",
  "annotation",
  "integration",
  "visualization",
  "other",
])
export type ServiceCategory = z.infer<typeof ServiceCategory>

export const ServiceSource = z.enum(["ddbj", "dbcls"])
export type ServiceSource = z.infer<typeof ServiceSource>

const langString = z.object({
  ja: z.string(),
  en: z.string(),
})

const langOptionalUrl = z.object({
  ja: z.string().url().optional(),
  en: z.string().url().optional(),
})

export const ServiceItem = z.object({
  id: z.string().min(1),
  source: ServiceSource,
  name: langString,
  description: langString,
  url: langOptionalUrl.optional(),
  categories: z.array(ServiceCategory).default([]),
  rawCategories: z.array(z.string()).default([]),
  featuredTop: z.boolean().default(false),
  provider: z.string().optional(),
})
export type ServiceItem = z.infer<typeof ServiceItem>

export const ServiceList = z.array(ServiceItem)
export type ServiceList = z.infer<typeof ServiceList>

export const ServiceCache = z.object({
  schemaVersion: z.literal(2),
  lastSyncSha: z.record(ServiceSource, z.string().nullable()),
  lastFetchedAt: z.string().datetime({ offset: true }),
  items: ServiceList,
})
export type ServiceCache = z.infer<typeof ServiceCache>
