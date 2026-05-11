import type { Lang } from "@/i18n"

import { fetchGlobalYaml, fetchNewsTree, fetchRawFile, type NewsFileEntry } from "./github-client"
import { linkPairs, normalizeAll, sortItemsByDateDesc } from "./normalize"
import { parseNewsFile } from "./parser"
import { loadFromDisk, persistToDisk, setSnapshot } from "./store"
import { EMPTY_TOP_NEWS, parseGlobalYaml, type TopNewsConfig } from "./top-news"
import { type MirroredNewsItem, NEWS_CACHE_SCHEMA_VERSION, type NewsSnapshot } from "./types"

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000
const FAILURE_ALERT_THRESHOLD = 5
const DEFAULT_MAX_FILES_PER_LANG = 400

const langForPath = (filePath: string): Lang | null => {
  if (filePath.startsWith("_news/ja/")) return "ja"
  if (filePath.startsWith("_news/en/")) return "en"

  return null
}

const pathOfItem = (item: MirroredNewsItem): string => {
  const filename = item.lang === "en" ? `${item.slug}-e.md` : `${item.slug}.md`

  return `_news/${item.lang}/${filename}`
}

interface SyncMetrics {
  itemCount: number
  durationMs: number
  refSha: string
  changed: boolean
}

const lastFileShaMap = new Map<string, string>()
let lastSnapshotItems: MirroredNewsItem[] = []
let failureStreak = 0

const FETCH_CONCURRENCY = 16

const fetchInBatches = async <T, R>(
  items: readonly T[],
  worker: (item: T) => Promise<R>,
  concurrency: number,
): Promise<R[]> => {
  const results: R[] = new Array(items.length) as R[]
  let cursor = 0
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (true) {
      const index = cursor++
      if (index >= items.length) return
      const item = items[index]
      if (item === undefined) return
      results[index] = await worker(item)
    }
  })
  await Promise.all(runners)

  return results
}

const fetchAndNormalize = async (files: NewsFileEntry[], topNews: TopNewsConfig): Promise<MirroredNewsItem[]> => {
  const parsed = await fetchInBatches(files, async (file) => {
    const lang = langForPath(file.path)
    if (!lang) return null
    const raw = await fetchRawFile(file.path)

    return parseNewsFile(file.path, file.sha, raw, lang)
  }, FETCH_CONCURRENCY)
  const valid = parsed.filter((p): p is NonNullable<typeof p> => p !== null)
  const { items, warnings } = await normalizeAll(valid, topNews)
  for (const w of warnings) {
    console.warn("[news-mirror] skipped", w.filePath, "—", w.reason)
  }

  return items
}

const fetchTopNews = async (): Promise<TopNewsConfig> => {
  try {
    const raw = await fetchGlobalYaml()

    return parseGlobalYaml(raw)
  } catch (e) {
    console.warn("[news-mirror] failed to fetch _data/global.yml:", e instanceof Error ? e.message : e)

    return EMPTY_TOP_NEWS
  }
}

const reclassifyKeepItems = (items: MirroredNewsItem[], topNews: TopNewsConfig): void => {
  for (const item of items) {
    item.type = topNews[item.lang].has(item.slug) ? "notification" : "news"
  }
}

const trimToMaxPerLang = (files: NewsFileEntry[], maxPerLang: number): NewsFileEntry[] => {
  const grouped = { ja: [] as NewsFileEntry[], en: [] as NewsFileEntry[] }
  for (const file of files) {
    const lang = langForPath(file.path)
    if (lang === "ja") grouped.ja.push(file)
    else if (lang === "en") grouped.en.push(file)
  }
  grouped.ja.sort((a, b) => b.path.localeCompare(a.path))
  grouped.en.sort((a, b) => b.path.localeCompare(a.path))

  return [...grouped.ja.slice(0, maxPerLang), ...grouped.en.slice(0, maxPerLang)]
}

const runSync = async (): Promise<SyncMetrics> => {
  const start = Date.now()
  const tree = await fetchNewsTree()
  if (!tree.changed) {
    return { itemCount: lastSnapshotItems.length, durationMs: Date.now() - start, refSha: tree.refSha, changed: false }
  }
  const maxPerLang = Number(process.env.NEWS_MIRROR_MAX_FILES_PER_LANG ?? DEFAULT_MAX_FILES_PER_LANG)
  const safeMaxPerLang
    = Number.isFinite(maxPerLang) && maxPerLang > 0 ? Math.floor(maxPerLang) : DEFAULT_MAX_FILES_PER_LANG
  const trimmedFiles = trimToMaxPerLang(tree.files, safeMaxPerLang)
  const treePaths = new Set(trimmedFiles.map((f) => f.path))
  const changedFiles = trimmedFiles.filter((f) => lastFileShaMap.get(f.path) !== f.sha)

  const keepItems = lastSnapshotItems.filter((item) => {
    const filePath = pathOfItem(item)
    if (!treePaths.has(filePath)) return false
    if (changedFiles.some((c) => c.path === filePath)) return false

    return true
  })

  const topNews = await fetchTopNews()
  const newItems = await fetchAndNormalize(changedFiles, topNews)
  reclassifyKeepItems(keepItems, topNews)
  const merged = [...keepItems, ...newItems]
  linkPairs(merged)
  sortItemsByDateDesc(merged)

  lastFileShaMap.clear()
  for (const file of trimmedFiles) lastFileShaMap.set(file.path, file.sha)
  lastSnapshotItems = merged

  const fileShas: Record<string, string> = {}
  for (const [p, sha] of lastFileShaMap) fileShas[p] = sha

  const snapshot: NewsSnapshot = {
    items: merged,
    fileShas,
    builtAt: new Date().toISOString(),
    sourceSha: tree.refSha,
    schemaVersion: NEWS_CACHE_SCHEMA_VERSION,
  }
  setSnapshot(snapshot)
  await persistToDisk(snapshot)

  return { itemCount: merged.length, durationMs: Date.now() - start, refSha: tree.refSha, changed: true }
}

export const initBoot = async (): Promise<void> => {
  const disk = await loadFromDisk()
  if (disk) {
    lastSnapshotItems = disk.items
    for (const [path, sha] of Object.entries(disk.fileShas)) lastFileShaMap.set(path, sha)
    console.info("[news-mirror] booted from disk", { items: disk.items.length, sourceSha: disk.sourceSha })
  }
}

export const runOnce = async (): Promise<SyncMetrics> => {
  try {
    const metrics = await runSync()
    if (metrics.changed) {
      console.info("[news-mirror] synced", metrics)
    }
    failureStreak = 0

    return metrics
  } catch (err) {
    failureStreak += 1
    const msg = err instanceof Error ? err.message : String(err)
    if (failureStreak >= FAILURE_ALERT_THRESHOLD) {
      console.error(`[news-mirror] sync failed (streak=${failureStreak}):`, msg)
    } else {
      console.warn(`[news-mirror] sync failed (streak=${failureStreak}):`, msg)
    }
    throw err
  }
}

interface WorkerHandle {
  timer: NodeJS.Timeout
  stop: () => void
}

const WORKER_KEY = Symbol.for("db-portal.news-mirror.worker")

interface GlobalRegistry {
  [WORKER_KEY]?: WorkerHandle | undefined
}

export const ensureWorkerStarted = (): void => {
  if (process.env.NEWS_DISABLE === "1") return
  if (process.env.NODE_ENV === "test") return
  const registry = globalThis as unknown as GlobalRegistry
  if (registry[WORKER_KEY]) return
  console.info("[news-mirror] starting worker")

  const intervalMs = Number(process.env.NEWS_SYNC_INTERVAL_MS ?? DEFAULT_INTERVAL_MS)
  const safeInterval = Number.isFinite(intervalMs) && intervalMs > 0 ? intervalMs : DEFAULT_INTERVAL_MS

  void initBoot().then(() => runOnce().catch(() => undefined))
  const timer = setInterval(() => {
    runOnce().catch(() => undefined)
  }, safeInterval)
  if (typeof timer.unref === "function") timer.unref()

  registry[WORKER_KEY] = {
    timer,
    stop: () => {
      clearInterval(timer)
      registry[WORKER_KEY] = undefined
    },
  }
}

export const __stopWorkerForTest = (): void => {
  const registry = globalThis as unknown as GlobalRegistry
  registry[WORKER_KEY]?.stop()
}

export const __resetWorkerStateForTest = (): void => {
  lastFileShaMap.clear()
  lastSnapshotItems = []
  failureStreak = 0
}
