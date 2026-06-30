import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"

import type {
  ServiceCache,
  ServiceCategory,
  ServiceItem,
  ServiceList,
  ServiceSource,
} from "../../app/schemas/api-bff/service"
import { SERVICE_CACHE_SCHEMA_VERSION, ServiceCache as ServiceCacheSchema } from "../../app/schemas/api-bff/service"
import type { Logger } from "../lib/log"

const CACHE_FILE = "services.json"
const SCHEMA_VERSION = SERVICE_CACHE_SCHEMA_VERSION

const emptyState = (): ServiceCache => ({
  schemaVersion: SCHEMA_VERSION,
  lastSyncSha: {},
  lastFetchedAt: new Date().toISOString(),
  items: [],
})

const cachePath = (cacheDir: string): string => path.join(cacheDir, CACHE_FILE)

type LoadResult = {
  state: ServiceCache
  source: "disk" | "empty"
}

export const loadCacheFromDisk = async (
  cacheDir: string,
  logger: Logger,
): Promise<LoadResult> => {
  try {
    const raw = await readFile(cachePath(cacheDir), "utf8")
    const json: unknown = JSON.parse(raw)
    const parsed = ServiceCacheSchema.safeParse(json)
    if (!parsed.success) {
      logger.warn("services_cache_schema_mismatch", { issues: parsed.error.issues.length })

      return { state: emptyState(), source: "empty" }
    }

    return { state: parsed.data, source: "disk" }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== "ENOENT") {
      logger.warn("services_cache_read_failed", { code: code ?? "unknown" })
    }

    return { state: emptyState(), source: "empty" }
  }
}

const persistCacheToDisk = async (
  cacheDir: string,
  state: ServiceCache,
  logger: Logger,
): Promise<void> => {
  try {
    await mkdir(cacheDir, { recursive: true })
    const file = cachePath(cacheDir)
    const tmp = `${file}.tmp`
    await writeFile(tmp, JSON.stringify(state, null, 2), "utf8")
    await rename(tmp, file)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    logger.warn("services_cache_persist_failed", { code: code ?? "unknown" })
  }
}

export type CacheStore = {
  getState: () => ServiceCache
  getSyncShaForSource: (source: ServiceSource) => string | null
  replaceItemsForSource: (
    source: ServiceSource,
    items: ServiceList,
    sha: string | null,
  ) => Promise<void>
  list: (filter?: ServiceFilter) => ServiceList
  initFromDisk: () => Promise<void>
}

type ServiceFilter = {
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

const sortItemsByName = (items: ServiceList): ServiceList =>
  [...items].sort((a, b) => {
    const byName = a.name.en.localeCompare(b.name.en, "en", { sensitivity: "base" })
    if (byName !== 0) return byName

    return a.id.localeCompare(b.id)
  })

const mergeItemsBySource = (
  state: ServiceCache,
  source: ServiceSource,
  next: ServiceList,
): ServiceList => {
  const kept = state.items.filter((item) => item.source !== source)

  return sortItemsByName([...kept, ...next])
}

export const createCacheStore = (cacheDir: string, logger: Logger): CacheStore => {
  let state: ServiceCache = emptyState()

  const initFromDisk = async (): Promise<void> => {
    const loaded = await loadCacheFromDisk(cacheDir, logger)
    state = loaded.state
    logger.info("services_cache_loaded", {
      source: loaded.source,
      items: state.items.length,
    })
  }

  const getSyncShaForSource = (source: ServiceSource): string | null =>
    state.lastSyncSha[source] ?? null

  const replaceItemsForSource = async (
    source: ServiceSource,
    items: ServiceList,
    sha: string | null,
  ): Promise<void> => {
    state = {
      schemaVersion: SCHEMA_VERSION,
      lastSyncSha: { ...state.lastSyncSha, [source]: sha },
      lastFetchedAt: new Date().toISOString(),
      items: mergeItemsBySource(state, source, items),
    }
    await persistCacheToDisk(cacheDir, state, logger)
  }

  const list = (filter?: ServiceFilter): ServiceList =>
    state.items.filter((item) => matchesFilter(item, filter))

  return {
    getState: () => state,
    getSyncShaForSource,
    replaceItemsForSource,
    list,
    initFromDisk,
  }
}
