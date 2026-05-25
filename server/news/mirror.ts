import type { NewsList, NewsSource } from "../../app/schemas/api-bff/news"
import type { ServerEnv } from "../lib/env"
import type { Logger } from "../lib/log"
import {
  type CacheStore,
  createCacheStore,
  type LangSha,
} from "./cache"
import {
  compareCommits,
  fetchContents,
  fetchLatestCommitSha,
  fetchRawText,
  type GitHubClientConfig,
} from "./github-client"
import { type LangRawMap, pairToNewsItems, parseRawArticle } from "./pair"
import { dbclsConfig, ddbjConfig, type GitHubSourceConfig } from "./sources"

const INITIAL_DELAY_MS = 5_000

type Lang = "ja" | "en"

const buildClient = (
  cfg: GitHubSourceConfig,
  token: string | undefined,
  logger: Logger,
): GitHubClientConfig => ({
  repo: cfg.repo,
  branch: cfg.branch,
  token,
  logger,
})

const collectAll = async (
  client: GitHubClientConfig,
  cfg: GitHubSourceConfig,
  lang: Lang,
): Promise<LangRawMap> => {
  const entries = await fetchContents(client, cfg.pathByLang[lang])
  const map: LangRawMap = new Map()
  for (const entry of entries) {
    if (!entry.name.endsWith(".md")) continue
    if (!entry.download_url) continue
    const raw = await fetchRawText(client, entry.download_url)
    if (!raw) continue
    const parsed = parseRawArticle(cfg.source, lang, entry.name, raw, cfg.slugFromFilename)
    if (parsed) map.set(parsed.slug, parsed)
  }

  return map
}

const cacheMapsForSource = (
  cache: CacheStore,
  cfg: GitHubSourceConfig,
): { ja: LangRawMap; en: LangRawMap } => {
  const ja: LangRawMap = new Map()
  const en: LangRawMap = new Map()
  const idPrefix = `${cfg.source}-`
  for (const item of cache.getState().items) {
    if (item.source !== cfg.source) continue
    const slug = item.id.startsWith(idPrefix) ? item.id.slice(idPrefix.length) : item.id
    if (item.title.ja) {
      ja.set(slug, {
        source: cfg.source,
        lang: "ja",
        slug,
        fm: {
          title: item.title.ja,
          date: item.publishedAt,
          db: item.db,
          tags: item.rawTags.ja,
          lang: "ja",
          ...(item.retireTime ? { retire_time: item.retireTime } : {}),
        },
      })
    }
    if (item.title.en) {
      en.set(slug, {
        source: cfg.source,
        lang: "en",
        slug,
        fm: {
          title: item.title.en,
          date: item.publishedAt,
          db: item.db,
          tags: item.rawTags.en,
          lang: "en",
          ...(item.retireTime ? { retire_time: item.retireTime } : {}),
        },
      })
    }
  }

  return { ja, en }
}

const applyChangedFiles = async (
  client: GitHubClientConfig,
  cache: CacheStore,
  cfg: GitHubSourceConfig,
  changedByLang: { ja: Set<string>; en: Set<string> },
  lastCommitSha: LangSha,
): Promise<void> => {
  const current = cacheMapsForSource(cache, cfg)
  for (const lang of ["ja", "en"] as const) {
    if (changedByLang[lang].size === 0) continue
    const dirEntries = await fetchContents(client, cfg.pathByLang[lang])
    const byName = new Map(dirEntries.map((entry) => [entry.name, entry]))
    for (const filename of changedByLang[lang]) {
      const baseName = filename.split("/").pop()
      if (!baseName || !baseName.endsWith(".md")) continue
      const entry = byName.get(baseName)
      if (!entry || !entry.download_url) {
        const slug = cfg.slugFromFilename(lang, baseName)
        if (slug) current[lang].delete(slug)
        continue
      }
      const raw = await fetchRawText(client, entry.download_url)
      if (!raw) continue
      const parsed = parseRawArticle(cfg.source, lang, baseName, raw, cfg.slugFromFilename)
      if (parsed) current[lang].set(parsed.slug, parsed)
    }
  }
  const items: NewsList = pairToNewsItems(cfg, current.ja, current.en)
  await cache.replaceItemsForSource(cfg.source, items, lastCommitSha)
}

export type NewsMirror = {
  start: () => void
  stop: () => void
}

let activeCache: CacheStore | undefined

export const getActiveNewsCache = (): CacheStore | undefined => activeCache

export const sourceConfigs = (env: ServerEnv): GitHubSourceConfig[] => [
  ddbjConfig(env.DB_PORTAL_NEWS_MIRROR_DDBJ_REPO, env.DB_PORTAL_NEWS_MIRROR_DDBJ_BRANCH),
  dbclsConfig(env.DB_PORTAL_NEWS_MIRROR_DBCLS_REPO, env.DB_PORTAL_NEWS_MIRROR_DBCLS_BRANCH),
]

const createSourcePoller = (
  cache: CacheStore,
  cfg: GitHubSourceConfig,
  client: GitHubClientConfig,
  logger: Logger,
): (() => Promise<void>) => {
  let inflight = false

  return async (): Promise<void> => {
    if (inflight) return
    inflight = true
    try {
      const [latestJa, latestEn] = await Promise.all([
        fetchLatestCommitSha(client, cfg.pathByLang.ja),
        fetchLatestCommitSha(client, cfg.pathByLang.en),
      ])
      const previous = cache.getCommitShaForSource(cfg.source)
      const newJa = latestJa ?? null
      const newEn = latestEn ?? null
      if (newJa === null && newEn === null) {
        logger.debug("news_mirror_skip_no_remote_sha", { source: cfg.source })

        return
      }
      if (newJa === previous.ja && newEn === previous.en) {
        logger.debug("news_mirror_no_change", { source: cfg.source, ja: newJa, en: newEn })
        await cache.updateCommitShaForSource(cfg.source, { ja: newJa, en: newEn })

        return
      }
      if (previous.ja === null || previous.en === null) {
        const [ja, en] = await Promise.all([
          collectAll(client, cfg, "ja"),
          collectAll(client, cfg, "en"),
        ])
        const items = pairToNewsItems(cfg, ja, en)
        await cache.replaceItemsForSource(cfg.source, items, { ja: newJa, en: newEn })
        logger.info("news_mirror_full_refresh", { source: cfg.source, items: items.length })

        return
      }
      const changedByLang = { ja: new Set<string>(), en: new Set<string>() }
      for (const lang of ["ja", "en"] as const) {
        const base = previous[lang]
        const head = lang === "ja" ? newJa : newEn
        if (!base || !head || base === head) continue
        const files = await compareCommits(client, base, head)
        if (!files) {
          const [ja, en] = await Promise.all([
            collectAll(client, cfg, "ja"),
            collectAll(client, cfg, "en"),
          ])
          const items = pairToNewsItems(cfg, ja, en)
          await cache.replaceItemsForSource(cfg.source, items, { ja: newJa, en: newEn })
          logger.info("news_mirror_compare_fallback", { source: cfg.source, items: items.length })

          return
        }
        for (const file of files) {
          if (!file.filename.startsWith(cfg.pathByLang[lang])) continue
          changedByLang[lang].add(file.filename)
        }
      }
      await applyChangedFiles(client, cache, cfg, changedByLang, { ja: newJa, en: newEn })
      logger.info("news_mirror_partial_refresh", {
        source: cfg.source,
        jaChanged: changedByLang.ja.size,
        enChanged: changedByLang.en.size,
      })
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
  const pollers = configs.map((cfg) =>
    createSourcePoller(cache, cfg, buildClient(cfg, env.DB_PORTAL_NEWS_MIRROR_GITHUB_TOKEN, logger), logger),
  )
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let initialTimer: ReturnType<typeof setTimeout> | null = null

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
      void cache.initFromDisk()
      initialTimer = setTimeout(() => {
        void tickAll()
      }, INITIAL_DELAY_MS)
      initialTimer.unref?.()
      pollTimer = setInterval(() => {
        void tickAll()
      }, intervalMs)
      pollTimer.unref?.()
    },
    stop: () => {
      if (initialTimer) {
        clearTimeout(initialTimer)
        initialTimer = null
      }
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
