import { z } from "zod"

import { BsiSource, cacheWrapper, langOptionalUrl, langString } from "./_shared"

export const ServiceCategory = z.enum([
  "repository",
  "search",
  "analysis",
  "integration",
  "visualization",
  "other",
])
export type ServiceCategory = z.infer<typeof ServiceCategory>

export const ServiceSource = BsiSource
export type ServiceSource = z.infer<typeof ServiceSource>

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

export const SERVICE_CACHE_SCHEMA_VERSION = 3

export const ServiceCache = cacheWrapper(ServiceList, SERVICE_CACHE_SCHEMA_VERSION)
export type ServiceCache = z.infer<typeof ServiceCache>
