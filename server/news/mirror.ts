import type { Dirent } from "node:fs"
import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

import type { NewsList, NewsSource } from "../../app/schemas/api-bff/news"
import type { ServerEnv } from "../lib/env"
import type { Logger } from "../lib/log"
import { type CacheStore, createCacheStore } from "./cache"
import {
  emptyWhitelist,
  type FeaturedWhitelist,
  isFeaturedSlug,
  loadFeaturedWhitelist,
} from "./featured"
import {
  defaultRunGit,
  getHeadSha,
  type RunGit,
  syncRepo,
} from "./git-sync"
import { type LangRawMap, pairToNewsItems, parseRawArticle } from "./pair"
import { dbclsConfig, ddbjConfig, type RepoSourceConfig } from "./sources"

type NewsMirror = {
  start: () => void
  stop: () => void
}

/**
 * 各 source の git sync が成功するたびに、確定した HEAD SHA を渡して呼ばれる。
 * 同じ clone を読む別 mirror (services) が news の clone を再利用するための hook。
 * 呼び出し側 (news) は callback の中身を知らない。
 */
type OnSourceSynced = (
  source: NewsSource,
  localDir: string,
  sha: string,
) => Promise<void>

type NewsMirrorOptions = {
  onSourceSynced?: OnSourceSynced
}

let activeCache: CacheStore | undefined

export const getActiveNewsCache = (): CacheStore | undefined => activeCache

const sourceConfigs = (env: ServerEnv): RepoSourceConfig[] => [
  ddbjConfig(
    env.DB_PORTAL_NEWS_DDBJ_REPO_URL,
    env.DB_PORTAL_NEWS_MIRROR_DDBJ_BRANCH,
    path.join(env.DB_PORTAL_NEWS_REPOS_DIR, "ddbj-www"),
  ),
  dbclsConfig(
    env.DB_PORTAL_NEWS_DBCLS_REPO_URL,
    env.DB_PORTAL_NEWS_MIRROR_DBCLS_BRANCH,
    path.join(env.DB_PORTAL_NEWS_REPOS_DIR, "dbcls-website"),
  ),
]

type CollectResult =
  | { ok: true; map: LangRawMap }
  | { ok: false }

const collectAll = async (
  cfg: RepoSourceConfig,
  lang: "ja" | "en",
  logger: Logger,
): Promise<CollectResult> => {
  const dir = cfg.pathByLang[lang]
  const map: LangRawMap = new Map()
  let entries: Dirent[]
  try {
    entries = await readdir(dir, { withFileTypes: true })
  } catch (error) {
    logger.warn("news_dir_read_failed", {
      source: cfg.source,
      lang,
      dir,
      message: error instanceof Error ? error.message : String(error),
    })

    return { ok: false }
  }
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue
    const raw = await readFile(path.join(dir, entry.name), "utf8")
    const parsed = parseRawArticle(cfg.source, lang, entry.name, raw, cfg.slugFromFilename)
    if (parsed) map.set(parsed.slug, parsed)
  }

  return { ok: true, map }
}

export const rebuildNewsForSource = async (
  cache: CacheStore,
  cfg: RepoSourceConfig,
  whitelist: FeaturedWhitelist,
  sha: string,
  logger: Logger,
): Promise<void> => {
  const [ja, en] = await Promise.all([
    collectAll(cfg, "ja", logger),
    collectAll(cfg, "en", logger),
  ])
  // docs/news.md: pull 失敗は warn にとどめ既存 cache をそのまま提供する。
  // 両 lang dir が同時に read 不能なのは upstream の構造変化 or transient FS 障害なので、
  // 既存 cache を消さず lastSyncSha も進めない (services/mirror.ts の早期 return と対称)。
  if (!ja.ok && !en.ok) {
    logger.warn("news_mirror_rebuild_skipped_both_lang_unreadable", {
      source: cfg.source,
      sha,
    })

    return
  }
  const jaMap: LangRawMap = ja.ok ? ja.map : new Map()
  const enMap: LangRawMap = en.ok ? en.map : new Map()
  const items = pairToNewsItems(cfg, jaMap, enMap, (slug) =>
    isFeaturedSlug(cfg.source, slug, whitelist))
  await cache.replaceItemsForSource(cfg.source, items as NewsList, sha)
  logger.info("news_mirror_full_refresh", { source: cfg.source, items: items.length })
}

const createSourcePoller = (
  cache: CacheStore,
  cfg: RepoSourceConfig,
  runGit: RunGit,
  logger: Logger,
  getWhitelist: () => Promise<FeaturedWhitelist>,
  onSourceSynced?: OnSourceSynced,
): (() => Promise<void>) => {
  let inflight = false

  return async (): Promise<void> => {
    if (inflight) return
    inflight = true
    try {
      const sync = await syncRepo(cfg.repoUrl, cfg.branch, cfg.localDir, runGit)
      if (!sync.ok) {
        logger.warn("news_git_sync_failed", {
          source: cfg.source,
          stderr: sync.stderr.slice(0, 200),
        })

        return
      }
      const newSha = await getHeadSha(cfg.localDir, runGit)
      if (!newSha) {
        logger.warn("news_git_head_unknown", { source: cfg.source })

        return
      }
      // sync 成功のたびに通知する (no-change でも)。受け手は自身の SHA で再構築要否を判定する。
      if (onSourceSynced) {
        try {
          await onSourceSynced(cfg.source, cfg.localDir, newSha)
        } catch (error) {
          logger.warn("news_on_source_synced_failed", {
            source: cfg.source,
            message: error instanceof Error ? error.message : String(error),
          })
        }
      }
      const previous = cache.getSyncShaForSource(cfg.source)
      if (newSha === previous) {
        logger.debug("news_mirror_no_change", { source: cfg.source, sha: newSha })

        return
      }
      const whitelist = await getWhitelist()
      await rebuildNewsForSource(cache, cfg, whitelist, newSha, logger)
    } catch (error) {
      logger.error("news_mirror_failed", {
        source: cfg.source,
        message: error instanceof Error ? error.message : String(error),
      })
    } finally {
      inflight = false
    }
  }
}

export const createNewsMirror = (
  env: ServerEnv,
  logger: Logger,
  options: NewsMirrorOptions = {},
): {
  mirror: NewsMirror
  cache: CacheStore
} => {
  const cache = createCacheStore(env.DB_PORTAL_NEWS_CACHE_DIR, logger)
  const configs = sourceConfigs(env)
  const ddbjGlobalYaml = configs.find((c) => c.source === "ddbj")?.globalYamlPath

  const getWhitelist = async (): Promise<FeaturedWhitelist> => {
    if (!ddbjGlobalYaml) return emptyWhitelist()

    return loadFeaturedWhitelist(ddbjGlobalYaml, logger)
  }

  const pollers = configs.map((cfg) =>
    createSourcePoller(cache, cfg, defaultRunGit, logger, getWhitelist, options.onSourceSynced))

  let pollTimer: ReturnType<typeof setInterval> | null = null

  const tickAll = async (): Promise<void> => {
    // poller はそれぞれ独立した remote repo (DDBJ / DBCLS) を fetch するので順序
    // 依存はない。 Promise.all で並列化して interval 内の総所要時間を圧縮する。
    await Promise.all(pollers.map((poll) => poll()))
  }

  const mirror: NewsMirror = {
    start: () => {
      if (pollTimer) return
      const intervalMs = env.DB_PORTAL_NEWS_MIRROR_INTERVAL_SECONDS * 1000
      activeCache = cache
      void cache.initFromDisk().then(() => tickAll())
      pollTimer = setInterval(() => {
        void tickAll()
      }, intervalMs)
      pollTimer.unref?.()
    },
    stop: () => {
      if (pollTimer) {
        clearInterval(pollTimer)
        pollTimer = null
      }
      if (activeCache === cache) activeCache = undefined
    },
  }

  return { mirror, cache }
}

