import { fetchGlobalYaml, fetchNewsTree, fetchRawFile, type NewsFileEntry } from "./github-client"
import { linkPairs, normalizeAll, sortItemsByDateDesc } from "./normalize"
import { parseNewsFile } from "./parser"
import { getNewsSourceConfigs, langForPath, type NewsSourceConfig } from "./sources"
import { loadFromDisk, persistToDisk, setSnapshot } from "./store"
import { EMPTY_TOP_NEWS, parseGlobalYaml, type TopNewsConfig } from "./top-news"
import {
  type MirroredNewsItem,
  NEWS_CACHE_SCHEMA_VERSION,
  type NewsSnapshot,
  type NewsSource,
  SUPPORTED_SOURCES,
} from "./types"

const DEFAULT_INTERVAL_MS = 10 * 60 * 1000
const FAILURE_ALERT_THRESHOLD = 5
const FETCH_CONCURRENCY = 16

const lastFileShaMap = new Map<NewsSource, Map<string, string>>()
const lastSnapshotItemsBySource = new Map<NewsSource, MirroredNewsItem[]>()
const lastSourceSha = new Map<NewsSource, string>()
const failureStreak = new Map<NewsSource, number>()

const getShaMap = (source: NewsSource): Map<string, string> => {
  const existing = lastFileShaMap.get(source)
  if (existing) return existing
  const next = new Map<string, string>()
  lastFileShaMap.set(source, next)

  return next
}

const emptyShasRecord = (): Record<NewsSource, Record<string, string>> => ({
  ddbj: {},
  dbcls: {},
})

const emptySourceShas = (): Record<NewsSource, string> => ({ ddbj: "", dbcls: "" })

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

const fetchAndNormalize = async (
  cfg: NewsSourceConfig,
  files: NewsFileEntry[],
  topNews: TopNewsConfig,
): Promise<MirroredNewsItem[]> => {
  const parsed = await fetchInBatches(files, async (file) => {
    const lang = langForPath(cfg, file.path)
    if (!lang) return null
    const raw = await fetchRawFile(cfg, file.path)

    return parseNewsFile(cfg, file.path, file.sha, raw, lang)
  }, FETCH_CONCURRENCY)
  const valid = parsed.filter((p): p is NonNullable<typeof p> => p !== null)
  const { items, warnings, droppedTags } = await normalizeAll(cfg, valid, topNews)
  for (const w of warnings) {
    console.warn("[news-mirror] skipped", w.filePath, "—", w.reason)
  }
  for (const d of droppedTags) {
    console.warn("[news-mirror] dropped unknown tags:", d.filePath, d.tags)
  }

  return items
}

const fetchTopNewsFor = async (cfg: NewsSourceConfig): Promise<TopNewsConfig> => {
  if (!cfg.needsTopNews) return EMPTY_TOP_NEWS
  try {
    const raw = await fetchGlobalYaml(cfg)

    return parseGlobalYaml(raw)
  } catch (e) {
    console.warn(
      `[news-mirror] failed to fetch global.yml (${cfg.source}):`,
      e instanceof Error ? e.message : e,
    )

    return EMPTY_TOP_NEWS
  }
}

const reclassifyKeepItems = (
  cfg: NewsSourceConfig,
  items: MirroredNewsItem[],
  topNews: TopNewsConfig,
): void => {
  if (cfg.source !== "ddbj") return
  for (const item of items) {
    if (item.source !== "ddbj") continue
    item.type = topNews[item.lang].has(item.slug) ? "notification" : "news"
  }
}

const trimToMaxPerLang = (cfg: NewsSourceConfig, files: NewsFileEntry[]): NewsFileEntry[] => {
  const ja: NewsFileEntry[] = []
  const en: NewsFileEntry[] = []
  for (const file of files) {
    const lang = langForPath(cfg, file.path)
    if (lang === "ja") ja.push(file)
    else if (lang === "en") en.push(file)
  }
  ja.sort((a, b) => b.path.localeCompare(a.path))
  en.sort((a, b) => b.path.localeCompare(a.path))

  return [...ja.slice(0, cfg.maxFilesPerLang), ...en.slice(0, cfg.maxFilesPerLang)]
}

const pathOfItem = (cfg: NewsSourceConfig, item: MirroredNewsItem): string | null => {
  if (cfg.source === "ddbj") {
    const filename = item.lang === "en" ? `${item.slug}-e.md` : `${item.slug}.md`

    return `_news/${item.lang}/${filename}`
  }
  if (cfg.source === "dbcls") {
    return `_posts/${item.lang}/${item.slug}.md`
  }

  return null
}

interface SourceSyncResult {
  source: NewsSource
  items: MirroredNewsItem[]
  refSha: string
  changed: boolean
}

const syncSingleSource = async (cfg: NewsSourceConfig): Promise<SourceSyncResult> => {
  const tree = await fetchNewsTree(cfg)
  const shaMap = getShaMap(cfg.source)
  const previousItems = lastSnapshotItemsBySource.get(cfg.source) ?? []

  if (!tree.changed) {
    return {
      source: cfg.source,
      items: previousItems,
      refSha: tree.refSha,
      changed: false,
    }
  }

  const trimmedFiles = trimToMaxPerLang(cfg, tree.files)
  const treePaths = new Set(trimmedFiles.map((f) => f.path))
  const changedFiles = trimmedFiles.filter((f) => shaMap.get(f.path) !== f.sha)

  const keepItems = previousItems.filter((item) => {
    const filePath = pathOfItem(cfg, item)
    if (filePath === null) return false
    if (!treePaths.has(filePath)) return false
    if (changedFiles.some((c) => c.path === filePath)) return false

    return true
  })

  const topNews = await fetchTopNewsFor(cfg)
  const newItems = await fetchAndNormalize(cfg, changedFiles, topNews)
  reclassifyKeepItems(cfg, keepItems, topNews)
  const merged = [...keepItems, ...newItems]

  shaMap.clear()
  for (const file of trimmedFiles) shaMap.set(file.path, file.sha)

  return {
    source: cfg.source,
    items: merged,
    refSha: tree.refSha,
    changed: true,
  }
}

interface SyncMetrics {
  itemCount: number
  durationMs: number
  perSource: { source: NewsSource; changed: boolean; refSha: string; count: number }[]
}

const runSync = async (): Promise<SyncMetrics> => {
  const start = Date.now()
  const configs = getNewsSourceConfigs()
  const settled = await Promise.allSettled(configs.map((cfg) => syncSingleSource(cfg)))

  const perSource: SyncMetrics["perSource"] = []

  for (let i = 0; i < settled.length; i++) {
    const cfg = configs[i]
    const res = settled[i]
    if (!cfg || !res) continue
    if (res.status === "fulfilled") {
      failureStreak.set(cfg.source, 0)
      lastSnapshotItemsBySource.set(cfg.source, res.value.items)
      lastSourceSha.set(cfg.source, res.value.refSha)
      perSource.push({
        source: cfg.source,
        changed: res.value.changed,
        refSha: res.value.refSha,
        count: res.value.items.length,
      })
    } else {
      const streak = (failureStreak.get(cfg.source) ?? 0) + 1
      failureStreak.set(cfg.source, streak)
      const msg = res.reason instanceof Error ? res.reason.message : String(res.reason)
      if (streak >= FAILURE_ALERT_THRESHOLD) {
        console.error(`[news-mirror] sync failed (${cfg.source}, streak=${streak}):`, msg)
      } else {
        console.warn(`[news-mirror] sync failed (${cfg.source}, streak=${streak}):`, msg)
      }
      const previousItems = lastSnapshotItemsBySource.get(cfg.source) ?? []
      const previousRefSha = lastSourceSha.get(cfg.source) ?? ""
      perSource.push({
        source: cfg.source,
        changed: false,
        refSha: previousRefSha,
        count: previousItems.length,
      })
    }
  }

  const allItems: MirroredNewsItem[] = []
  const fileShasOut = emptyShasRecord()
  const sourceShasOut = emptySourceShas()
  for (const source of SUPPORTED_SOURCES) {
    const items = lastSnapshotItemsBySource.get(source) ?? []
    allItems.push(...items)
    const shaMap = getShaMap(source)
    const obj: Record<string, string> = {}
    for (const [p, sha] of shaMap) obj[p] = sha
    fileShasOut[source] = obj
    sourceShasOut[source] = lastSourceSha.get(source) ?? ""
  }

  linkPairs(allItems)
  sortItemsByDateDesc(allItems)

  const snapshot: NewsSnapshot = {
    items: allItems,
    fileShas: fileShasOut,
    sourceShas: sourceShasOut,
    builtAt: new Date().toISOString(),
    schemaVersion: NEWS_CACHE_SCHEMA_VERSION,
  }
  setSnapshot(snapshot)
  await persistToDisk(snapshot)

  const anyChanged = perSource.some((p) => p.changed)
  if (anyChanged) {
    console.info("[news-mirror] synced", { perSource, total: allItems.length })
  }

  return {
    itemCount: allItems.length,
    durationMs: Date.now() - start,
    perSource,
  }
}

export const initBoot = async (): Promise<void> => {
  const disk = await loadFromDisk()
  if (!disk) return

  for (const source of SUPPORTED_SOURCES) {
    const items = disk.items.filter((it) => it.source === source)
    lastSnapshotItemsBySource.set(source, items)
    const shaMap = getShaMap(source)
    const sourceFileShas = disk.fileShas[source] ?? {}
    for (const [p, sha] of Object.entries(sourceFileShas)) shaMap.set(p, sha)
    lastSourceSha.set(source, disk.sourceShas[source] ?? "")
  }
  console.info("[news-mirror] booted from disk", { items: disk.items.length })
}

export const runOnce = async (): Promise<SyncMetrics> => runSync()

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
  lastSnapshotItemsBySource.clear()
  lastSourceSha.clear()
  failureStreak.clear()
}
