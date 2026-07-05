import { mkdir, readFile, rename, writeFile } from "node:fs/promises"
import path from "node:path"

import type { z } from "zod"

import type { Logger } from "./log"

export type CacheStateShape<TSource extends string, TItem> = {
  schemaVersion: number
  lastSyncSha: Partial<Record<TSource, string | null>>
  lastFetchedAt: string
  items: TItem[]
}

export type CacheStore<TSource extends string, TItem, TFilter> = {
  getState: () => CacheStateShape<TSource, TItem>
  getSyncShaForSource: (source: TSource) => string | null
  replaceItemsForSource: (source: TSource, items: TItem[], sha: string | null) => Promise<void>
  list: (filter?: TFilter) => TItem[]
  initFromDisk: () => Promise<void>
}

type LoadConfig = {
  cacheFile: string
  schemaVersion: number
  cacheSchema: z.ZodTypeAny
  logPrefix: string
}

type CacheStoreConfig<TSource extends string, TItem, TFilter> = LoadConfig & {
  matchesFilter: (item: TItem, filter: TFilter | undefined) => boolean
  sortMerged: (items: TItem[]) => TItem[]
  getItemSource: (item: TItem) => TSource
}

const cachePath = (cacheDir: string, cacheFile: string): string => path.join(cacheDir, cacheFile)

const emptyState = <TSource extends string, TItem>(
  schemaVersion: number,
): CacheStateShape<TSource, TItem> => ({
  schemaVersion,
  lastSyncSha: {},
  lastFetchedAt: new Date().toISOString(),
  items: [],
})

export const loadCacheFromDisk = async <TSource extends string, TItem>(
  cacheDir: string,
  logger: Logger,
  config: LoadConfig,
): Promise<{ state: CacheStateShape<TSource, TItem>; source: "disk" | "empty" }> => {
  try {
    const raw = await readFile(cachePath(cacheDir, config.cacheFile), "utf8")
    const json: unknown = JSON.parse(raw)
    const parsed = config.cacheSchema.safeParse(json)
    if (!parsed.success) {
      logger.warn(`${config.logPrefix}_cache_schema_mismatch`, { issues: parsed.error.issues.length })

      return { state: emptyState<TSource, TItem>(config.schemaVersion), source: "empty" }
    }

    return { state: parsed.data as CacheStateShape<TSource, TItem>, source: "disk" }
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== "ENOENT") {
      logger.warn(`${config.logPrefix}_cache_read_failed`, { code: code ?? "unknown" })
    }

    return { state: emptyState<TSource, TItem>(config.schemaVersion), source: "empty" }
  }
}

const persistCacheToDisk = async <TSource extends string, TItem>(
  cacheDir: string,
  cacheFile: string,
  state: CacheStateShape<TSource, TItem>,
  logger: Logger,
  logPrefix: string,
): Promise<void> => {
  try {
    await mkdir(cacheDir, { recursive: true })
    const file = cachePath(cacheDir, cacheFile)
    const tmp = `${file}.tmp`
    await writeFile(tmp, JSON.stringify(state, null, 2), "utf8")
    await rename(tmp, file)
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    logger.warn(`${logPrefix}_cache_persist_failed`, { code: code ?? "unknown" })
  }
}

export const createCacheStore = <TSource extends string, TItem, TFilter>(
  cacheDir: string,
  logger: Logger,
  config: CacheStoreConfig<TSource, TItem, TFilter>,
): CacheStore<TSource, TItem, TFilter> => {
  let state: CacheStateShape<TSource, TItem> = emptyState<TSource, TItem>(config.schemaVersion)

  const initFromDisk = async (): Promise<void> => {
    const loaded = await loadCacheFromDisk<TSource, TItem>(cacheDir, logger, config)
    state = loaded.state
    logger.info(`${config.logPrefix}_cache_loaded`, {
      source: loaded.source,
      items: state.items.length,
    })
  }

  const getSyncShaForSource = (source: TSource): string | null =>
    state.lastSyncSha[source] ?? null

  const mergeItemsBySource = (source: TSource, next: TItem[]): TItem[] => {
    const kept = state.items.filter((item) => config.getItemSource(item) !== source)

    return config.sortMerged([...kept, ...next])
  }

  const replaceItemsForSource = async (
    source: TSource,
    items: TItem[],
    sha: string | null,
  ): Promise<void> => {
    state = {
      schemaVersion: config.schemaVersion,
      lastSyncSha: { ...state.lastSyncSha, [source]: sha },
      lastFetchedAt: new Date().toISOString(),
      items: mergeItemsBySource(source, items),
    }
    await persistCacheToDisk(cacheDir, config.cacheFile, state, logger, config.logPrefix)
  }

  const list = (filter?: TFilter): TItem[] =>
    state.items.filter((item) => config.matchesFilter(item, filter))

  return {
    getState: () => state,
    getSyncShaForSource,
    replaceItemsForSource,
    list,
    initFromDisk,
  }
}
