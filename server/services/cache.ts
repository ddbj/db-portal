import type {
  ServiceCategory,
  ServiceItem,
  ServiceSource,
} from "../../app/schemas/api-bff/service"
import {
  SERVICE_CACHE_SCHEMA_VERSION,
  ServiceCache as ServiceCacheSchema,
} from "../../app/schemas/api-bff/service"
import {
  type CacheStore as GenericCacheStore,
  createCacheStore as createGenericCacheStore,
  loadCacheFromDisk as loadGenericCacheFromDisk,
} from "../lib/cache-store"
import type { Logger } from "../lib/log"

export type ServiceFilter = {
  source?: readonly ServiceSource[]
  category?: readonly ServiceCategory[]
  featured?: boolean
}

const matchesFilter = (item: ServiceItem, filter: ServiceFilter | undefined): boolean => {
  if (!filter) return true
  if (filter.source && filter.source.length > 0) {
    if (!filter.source.includes(item.source)) return false
  }
  if (filter.category && filter.category.length > 0) {
    if (!filter.category.some((category) => item.categories.includes(category))) return false
  }
  if (filter.featured === true && !item.featuredTop) return false

  return true
}

const sortItemsByName = (items: ServiceItem[]): ServiceItem[] =>
  [...items].sort((a, b) => {
    const byName = a.name.en.localeCompare(b.name.en, "en", { sensitivity: "base" })
    if (byName !== 0) return byName

    return a.id.localeCompare(b.id)
  })

const FACTORY_CONFIG = {
  cacheFile: "services.json",
  schemaVersion: SERVICE_CACHE_SCHEMA_VERSION,
  cacheSchema: ServiceCacheSchema,
  matchesFilter,
  sortMerged: sortItemsByName,
  getItemSource: (item: ServiceItem) => item.source,
  logPrefix: "services",
}

export type CacheStore = GenericCacheStore<ServiceSource, ServiceItem, ServiceFilter>

export const createCacheStore = (cacheDir: string, logger: Logger): CacheStore =>
  createGenericCacheStore<ServiceSource, ServiceItem, ServiceFilter>(cacheDir, logger, FACTORY_CONFIG)

export const loadCacheFromDisk = (cacheDir: string, logger: Logger) =>
  loadGenericCacheFromDisk<ServiceSource, ServiceItem>(cacheDir, logger, FACTORY_CONFIG)
