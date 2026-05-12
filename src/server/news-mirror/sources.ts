import type { Lang } from "@/i18n"

import type { NewsSource } from "./types"

export interface NewsSourceConfig {
  source: NewsSource
  owner: string
  repo: string
  branch: string
  pathPrefix: { ja: string; en: string }
  filenamePattern: RegExp
  slugFromFilename: (basename: string, lang: Lang) => string | null
  buildSourceUrl: (slug: string, lang: Lang) => string
  buildSourceMdUrl: (filePath: string) => string
  needsTopNews: boolean
  enabled: boolean
  maxFilesPerLang: number
}

const DEFAULT_MAX_FILES_PER_LANG = 400

const intFromEnv = (key: string, fallback: number): number => {
  const raw = process.env[key]
  if (raw === undefined) return fallback
  const n = Number(raw)

  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}

const ddbjMaxFilesPerLang = (): number =>
  intFromEnv("NEWS_MIRROR_MAX_FILES_PER_LANG", DEFAULT_MAX_FILES_PER_LANG)

const dbclsMaxFilesPerLang = (): number => {
  const specific = process.env.NEWS_MIRROR_DBCLS_MAX_FILES_PER_LANG
  if (specific !== undefined) {
    const n = Number(specific)
    if (Number.isFinite(n) && n > 0) return Math.floor(n)
  }

  return ddbjMaxFilesPerLang()
}

const ddbjStripSlug = (basename: string, lang: Lang): string | null => {
  const noExt = basename.replace(/\.md$/i, "")
  if (!noExt) return null
  if (lang === "en" && noExt.endsWith("-e")) return noExt.slice(0, -2)

  return noExt
}

const dbclsStripSlug = (basename: string, _lang: Lang): string | null => {
  const m = basename.match(/^(\d{4}-\d{2}-\d{2}-post\d+)\.md$/i)

  return m?.[1] ?? null
}

export const ddbjConfig = (): NewsSourceConfig => {
  const branch = process.env.NEWS_MIRROR_BRANCH ?? "main"

  return {
    source: "ddbj",
    owner: "ddbj",
    repo: "www",
    branch,
    pathPrefix: { ja: "_news/ja/", en: "_news/en/" },
    filenamePattern: /^_news\/(ja|en)\/[^/]+\.md$/,
    slugFromFilename: ddbjStripSlug,
    buildSourceUrl: (slug, lang) =>
      `https://www.ddbj.nig.ac.jp/news/${lang}/${slug}.html`,
    buildSourceMdUrl: (filePath) =>
      `https://github.com/ddbj/www/blob/${branch}/${filePath}`,
    needsTopNews: true,
    enabled: true,
    maxFilesPerLang: ddbjMaxFilesPerLang(),
  }
}

export const dbclsConfig = (): NewsSourceConfig => {
  const branch = process.env.NEWS_MIRROR_DBCLS_BRANCH ?? "master"

  return {
    source: "dbcls",
    owner: "dbcls",
    repo: "website",
    branch,
    pathPrefix: { ja: "_posts/ja/", en: "_posts/en/" },
    filenamePattern: /^_posts\/(ja|en)\/\d{4}-\d{2}-\d{2}-post\d+\.md$/,
    slugFromFilename: dbclsStripSlug,
    buildSourceUrl: (slug, lang) => {
      const m = slug.match(/^(\d{4})-(\d{2})-(\d{2})-(post\d+)$/)
      if (!m) return "https://dbcls.rois.ac.jp/"
      const [, y, mo, d, title] = m

      return `https://dbcls.rois.ac.jp/${lang}/${y}/${mo}/${d}/${title}.html`
    },
    buildSourceMdUrl: (filePath) =>
      `https://github.com/dbcls/website/blob/${branch}/${filePath}`,
    needsTopNews: false,
    enabled: process.env.NEWS_MIRROR_DBCLS_ENABLED !== "0",
    maxFilesPerLang: dbclsMaxFilesPerLang(),
  }
}

export const getNewsSourceConfigs = (): NewsSourceConfig[] =>
  [ddbjConfig(), dbclsConfig()].filter((c) => c.enabled)

export const getSourceConfig = (source: NewsSource): NewsSourceConfig | null => {
  if (source === "ddbj") return ddbjConfig()
  if (source === "dbcls") return dbclsConfig()

  return null
}

export const langForPath = (cfg: NewsSourceConfig, filePath: string): Lang | null => {
  if (filePath.startsWith(cfg.pathPrefix.ja)) return "ja"
  if (filePath.startsWith(cfg.pathPrefix.en)) return "en"

  return null
}
