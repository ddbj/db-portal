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

export type NewsMirror = {
  start: () => void
  stop: () => void
}

let activeCache: CacheStore | undefined

export const getActiveNewsCache = (): CacheStore | undefined => activeCache

export const sourceConfigs = (env: ServerEnv): RepoSourceConfig[] => [
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

const collectAll = async (
  cfg: RepoSourceConfig,
  lang: "ja" | "en",
  logger: Logger,
): Promise<LangRawMap> => {
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

    return map
  }
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue
    const raw = await readFile(path.join(dir, entry.name), "utf8")
    const parsed = parseRawArticle(cfg.source, lang, entry.name, raw, cfg.slugFromFilename)
    if (parsed) map.set(parsed.slug, parsed)
  }

  return map
}

const rebuildForSource = async (
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
  const items = pairToNewsItems(cfg, ja, en, (slug) =>
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
      const previous = cache.getSyncShaForSource(cfg.source)
      if (newSha === previous) {
        logger.debug("news_mirror_no_change", { source: cfg.source, sha: newSha })

        return
      }
      const whitelist = await getWhitelist()
      await rebuildForSource(cache, cfg, whitelist, newSha, logger)
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

export const createNewsMirror = (env: ServerEnv, logger: Logger): {
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
    createSourcePoller(cache, cfg, defaultRunGit, logger, getWhitelist))

  let pollTimer: ReturnType<typeof setInterval> | null = null

  const tickAll = async (): Promise<void> => {
    for (const poll of pollers) {
      await poll()
    }
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

export type { NewsSource }
