import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"

import type { NewsCache, NewsCategory, NewsItem, NewsList } from "../../app/schemas/api-bff/news"
import { NewsCache as NewsCacheSchema } from "../../app/schemas/api-bff/news"
import type { Logger } from "../lib/log"

const CACHE_FILE = "news.json"
const SCHEMA_VERSION = 1 as const

const emptyState = (): NewsCache => ({
  schemaVersion: SCHEMA_VERSION,
  source: "ddbj",
  lastCommitSha: { ja: null, en: null },
  lastFetchedAt: new Date().toISOString(),
  items: [],
})

const cachePath = (cacheDir: string): string => path.join(cacheDir, CACHE_FILE)

export type LoadResult = {
  state: NewsCache
  source: "disk" | "empty"
}

export const loadCacheFromDisk = async (
  cacheDir: string,
  logger: Logger,
): Promise<LoadResult> => {
  try {
    const raw = await readFile(cachePath(cacheDir), "utf8")
    const json: unknown = JSON.parse(raw)
    const parsed = NewsCacheSchema.safeParse(json)
    if (!parsed.success) {
      logger.warn("news_cache_schema_mismatch", { issues: parsed.error.issues.length })

      return { state: emptyState(), source: "empty" }
    }

    return { state: parsed.data, source: "disk" }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== "ENOENT") {
      logger.warn("news_cache_read_failed", { code: code ?? "unknown" })
    }

    return { state: emptyState(), source: "empty" }
  }
}

export const persistCacheToDisk = async (
  cacheDir: string,
  state: NewsCache,
  logger: Logger,
): Promise<void> => {
  try {
    await mkdir(cacheDir, { recursive: true })
    const file = cachePath(cacheDir)
    const tmp = `${file}.tmp`
    await writeFile(tmp, JSON.stringify(state, null, 2), "utf8")
    const { rename } = await import("node:fs/promises")
    await rename(tmp, file)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    logger.warn("news_cache_persist_failed", { code: code ?? "unknown" })
  }
}

export type CacheStore = {
  getState: () => NewsCache
  replaceItems: (items: NewsList, lastCommitSha: NewsCache["lastCommitSha"]) => Promise<void>
  updateCommitSha: (lastCommitSha: NewsCache["lastCommitSha"]) => Promise<void>
  list: (filter?: NewsFilter) => NewsList
  initFromDisk: () => Promise<void>
}

export type NewsFilter = {
  lang?: "ja" | "en"
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

export const createCacheStore = (cacheDir: string, logger: Logger): CacheStore => {
  let state: NewsCache = emptyState()

  const initFromDisk = async (): Promise<void> => {
    const loaded = await loadCacheFromDisk(cacheDir, logger)
    state = loaded.state
    logger.info("news_cache_loaded", {
      source: loaded.source,
      items: state.items.length,
    })
  }

  const replaceItems = async (
    items: NewsList,
    lastCommitSha: NewsCache["lastCommitSha"],
  ): Promise<void> => {
    state = {
      schemaVersion: SCHEMA_VERSION,
      source: "ddbj",
      lastCommitSha,
      lastFetchedAt: new Date().toISOString(),
      items,
    }
    await persistCacheToDisk(cacheDir, state, logger)
  }

  const updateCommitSha = async (
    lastCommitSha: NewsCache["lastCommitSha"],
  ): Promise<void> => {
    state = { ...state, lastCommitSha, lastFetchedAt: new Date().toISOString() }
    await persistCacheToDisk(cacheDir, state, logger)
  }

  const list = (filter?: NewsFilter): NewsList =>
    state.items.filter((item) => matchesFilter(item, filter))

  return {
    getState: () => state,
    replaceItems,
    updateCommitSha,
    list,
    initFromDisk,
  }
}
