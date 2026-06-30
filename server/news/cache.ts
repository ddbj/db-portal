import type {
  NewsCategory,
  NewsItem,
  NewsSource,
} from "../../app/schemas/api-bff/news"
import {
  NEWS_CACHE_SCHEMA_VERSION,
  NewsCache as NewsCacheSchema,
} from "../../app/schemas/api-bff/news"
import {
  type CacheStore as GenericCacheStore,
  createCacheStore as createGenericCacheStore,
  loadCacheFromDisk as loadGenericCacheFromDisk,
} from "../lib/cache-store"
import type { Logger } from "../lib/log"

export type NewsFilter = {
  lang?: "ja" | "en"
  source?: readonly NewsSource[]
  category?: readonly NewsCategory[]
  year?: readonly number[]
  service?: readonly string[]
}

const matchesFilter = (item: NewsItem, filter: NewsFilter | undefined): boolean => {
  if (!filter) return true
  if (filter.lang) {
    const title = item.title[filter.lang]
    if (!title || title.trim() === "") return false
  }
  if (filter.source && filter.source.length > 0) {
    if (!filter.source.includes(item.source)) return false
  }
  if (filter.category && filter.category.length > 0) {
    if (!filter.category.includes(item.category)) return false
  }
  if (filter.year && filter.year.length > 0) {
    const year = Number(item.publishedAt.slice(0, 4))
    if (!filter.year.includes(year)) return false
  }
  if (filter.service && filter.service.length > 0) {
    if (!filter.service.some((s) => item.db.includes(s))) return false
  }

  return true
}

const sortItemsByDateDesc = (items: NewsItem[]): NewsItem[] =>
  [...items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

const FACTORY_CONFIG = {
  cacheFile: "news.json",
  schemaVersion: NEWS_CACHE_SCHEMA_VERSION,
  cacheSchema: NewsCacheSchema,
  matchesFilter,
  sortMerged: sortItemsByDateDesc,
  getItemSource: (item: NewsItem) => item.source,
  logPrefix: "news",
}

export type CacheStore = GenericCacheStore<NewsSource, NewsItem, NewsFilter>

export const createCacheStore = (cacheDir: string, logger: Logger): CacheStore =>
  createGenericCacheStore<NewsSource, NewsItem, NewsFilter>(cacheDir, logger, FACTORY_CONFIG)

export const loadCacheFromDisk = (cacheDir: string, logger: Logger) =>
  loadGenericCacheFromDisk<NewsSource, NewsItem>(cacheDir, logger, FACTORY_CONFIG)
