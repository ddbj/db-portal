import type { ServerEnv } from "../lib/env"
import type { Logger } from "../lib/log"
import {
  type CacheStore,
  createCacheStore,
} from "./cache"
import {
  compareCommits,
  fetchContents,
  fetchLatestCommitSha,
  fetchRawText,
  type GitHubClientConfig,
} from "./github-client"
import { type LangRawMap, pairToNewsItems, parseRawArticle } from "./pair"

const INITIAL_DELAY_MS = 5_000
const PATH_BY_LANG = { ja: "_news/ja", en: "_news/en" } as const

type Lang = "ja" | "en"

const buildClient = (env: ServerEnv, logger: Logger): GitHubClientConfig => ({
  repo: env.DB_PORTAL_NEWS_MIRROR_REPO,
  branch: env.DB_PORTAL_NEWS_MIRROR_BRANCH,
  token: env.DB_PORTAL_NEWS_MIRROR_GITHUB_TOKEN,
  logger,
})

const collectAll = async (
  client: GitHubClientConfig,
  lang: Lang,
): Promise<LangRawMap> => {
  const entries = await fetchContents(client, PATH_BY_LANG[lang])
  const map: LangRawMap = new Map()
  for (const entry of entries) {
    if (!entry.name.endsWith(".md")) continue
    if (!entry.download_url) continue
    const raw = await fetchRawText(client, entry.download_url)
    if (!raw) continue
    const parsed = parseRawArticle(lang, entry.name, raw)
    if (parsed) map.set(parsed.slug, parsed)
  }

  return map
}

const cacheMapsFromStore = (cache: CacheStore): { ja: LangRawMap; en: LangRawMap } => {
  const ja: LangRawMap = new Map()
  const en: LangRawMap = new Map()
  for (const item of cache.getState().items) {
    if (item.title.ja) {
      ja.set(item.id, {
        lang: "ja",
        slug: item.id,
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
      en.set(item.id, {
        lang: "en",
        slug: item.id,
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
  changedByLang: { ja: Set<string>; en: Set<string> },
): Promise<void> => {
  const current = cacheMapsFromStore(cache)
  for (const lang of ["ja", "en"] as const) {
    if (changedByLang[lang].size === 0) continue
    const dirEntries = await fetchContents(client, PATH_BY_LANG[lang])
    const byName = new Map(dirEntries.map((entry) => [entry.name, entry]))
    for (const filename of changedByLang[lang]) {
      const baseName = filename.split("/").pop()
      if (!baseName || !baseName.endsWith(".md")) continue
      const entry = byName.get(baseName)
      if (!entry || !entry.download_url) {
        const slug = baseName.replace(/\.md$/, "").replace(/-e$/, "")
        current[lang].delete(slug)
        continue
      }
      const raw = await fetchRawText(client, entry.download_url)
      if (!raw) continue
      const parsed = parseRawArticle(lang, baseName, raw)
      if (parsed) current[lang].set(parsed.slug, parsed)
    }
  }
  const items = pairToNewsItems(current.ja, current.en)
  await cache.replaceItems(items, cache.getState().lastCommitSha)
}

export type NewsMirror = {
  start: () => void
  stop: () => void
}

let activeCache: CacheStore | undefined

export const getActiveNewsCache = (): CacheStore | undefined => activeCache

export const createNewsMirror = (env: ServerEnv, logger: Logger): {
  mirror: NewsMirror
  cache: CacheStore
} => {
  const cache = createCacheStore(env.DB_PORTAL_NEWS_CACHE_DIR, logger)
  const client = buildClient(env, logger)
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let initialTimer: ReturnType<typeof setTimeout> | null = null
  let inflight = false

  const checkAndUpdate = async (): Promise<void> => {
    if (inflight) return
    inflight = true
    try {
      const [latestJa, latestEn] = await Promise.all([
        fetchLatestCommitSha(client, PATH_BY_LANG.ja),
        fetchLatestCommitSha(client, PATH_BY_LANG.en),
      ])
      const previous = cache.getState().lastCommitSha
      const newJa = latestJa ?? null
      const newEn = latestEn ?? null
      if (newJa === previous.ja && newEn === previous.en) {
        logger.debug("news_mirror_no_change", { ja: newJa, en: newEn })
        await cache.updateCommitSha({ ja: newJa, en: newEn })

        return
      }
      if (previous.ja === null || previous.en === null) {
        const [ja, en] = await Promise.all([
          collectAll(client, "ja"),
          collectAll(client, "en"),
        ])
        const items = pairToNewsItems(ja, en)
        await cache.replaceItems(items, { ja: newJa, en: newEn })
        logger.info("news_mirror_full_refresh", { items: items.length })

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
            collectAll(client, "ja"),
            collectAll(client, "en"),
          ])
          const items = pairToNewsItems(ja, en)
          await cache.replaceItems(items, { ja: newJa, en: newEn })
          logger.info("news_mirror_compare_fallback", { items: items.length })

          return
        }
        for (const file of files) {
          if (!file.filename.startsWith(PATH_BY_LANG[lang])) continue
          changedByLang[lang].add(file.filename)
        }
      }
      await applyChangedFiles(client, cache, changedByLang)
      await cache.updateCommitSha({ ja: newJa, en: newEn })
      logger.info("news_mirror_partial_refresh", {
        jaChanged: changedByLang.ja.size,
        enChanged: changedByLang.en.size,
      })
    } catch (error) {
      logger.error("news_mirror_failed", {
        message: error instanceof Error ? error.message : String(error),
      })
    } finally {
      inflight = false
    }
  }

  const mirror: NewsMirror = {
    start: () => {
      if (pollTimer) return
      const intervalMs = env.DB_PORTAL_NEWS_MIRROR_INTERVAL_SECONDS * 1000
      activeCache = cache
      void cache.initFromDisk()
      initialTimer = setTimeout(() => {
        void checkAndUpdate()
      }, INITIAL_DELAY_MS)
      initialTimer.unref?.()
      pollTimer = setInterval(() => {
        void checkAndUpdate()
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
