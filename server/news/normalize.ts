import type {
  NewsCategory,
  NewsItem,
  NewsSource,
} from "../../app/schemas/api-bff/news"
import { NewsCategory as NewsCategoryEnum } from "../../app/schemas/api-bff/news"

export { NewsCategory } from "../../app/schemas/api-bff/news"

const DEFAULT_CATEGORY: NewsCategory = "other"

const MAPPING: Record<NewsSource, Readonly<Record<string, NewsCategory>>> = {
  ddbj: {
    "お知らせ": "announcement",
    "announcement": "announcement",
    "データ公開": "data-release",
    "data release": "data-release",
    "メンテナンス": "maintenance",
    "maintenance": "maintenance",
  },
  dbcls: {
    "public_relations": "announcement",
    "events": "event",
    "registration": "event",
    "services": "service",
    "other": "other",
  },
}

export const tagsToCategory = (
  source: NewsSource,
  tags: readonly string[],
): NewsCategory => {
  const table = MAPPING[source]
  for (const tag of tags) {
    const key = tag.trim().toLowerCase()
    if (key === "") continue
    // Object.hasOwn avoids reaching prototype chain entries (e.g. "__proto__")
    if (!Object.hasOwn(table, key)) continue
    const found = table[key]
    if (found !== undefined) return found
  }

  return DEFAULT_CATEGORY
}

export const isNewsCategory = (value: string): value is NewsCategory =>
  (NewsCategoryEnum.options as readonly string[]).includes(value)

export type FrontMatter = {
  title?: string
  date?: string
  retire_time?: string
  category?: string
  db?: string[]
  tags?: string[]
  lang?: string
  published?: string
}

export type ParsedMarkdown = {
  fm: FrontMatter
  body: string
}

const stripQuotes = (raw: string): string => {
  if (raw.length < 2) return raw
  const first = raw[0]
  const last = raw[raw.length - 1]
  if ((first === "'" && last === "'") || (first === "\"" && last === "\"")) {
    return raw.slice(1, -1)
  }

  return raw
}

const ARRAY_KEYS = new Set(["db", "tags", "category"])
const KV_RE = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/
const ARRAY_ITEM_RE = /^\s+-\s+(.+)$/

export const parseFrontMatter = (markdown: string): ParsedMarkdown | undefined => {
  if (!markdown.startsWith("---")) return undefined
  const headerEnd = markdown.indexOf("\n---", 3)
  if (headerEnd === -1) return undefined
  const header = markdown.slice(3, headerEnd).split("\n")
  const bodyStart = headerEnd + "\n---".length
  const body = markdown.slice(bodyStart).replace(/^\r?\n/, "")
  const fm: FrontMatter = {}
  let openArrayKey: string | null = null
  for (const rawLine of header) {
    const line = rawLine.replace(/\r$/, "")
    if (line.trim() === "") continue
    const arrayMatch = ARRAY_ITEM_RE.exec(line)
    if (arrayMatch && openArrayKey) {
      const value = stripQuotes((arrayMatch[1] ?? "").trim())
      const arr = fm[openArrayKey as keyof FrontMatter] as string[] | undefined
      if (arr) arr.push(value)
      continue
    }
    const kvMatch = KV_RE.exec(line)
    if (!kvMatch) continue
    const key = kvMatch[1] ?? ""
    if (key === "") continue
    const value = (kvMatch[2] ?? "").trim()
    if (value === "" && ARRAY_KEYS.has(key)) {
      const arr: string[] = []
      ;(fm as Record<string, unknown>)[key] = arr
      openArrayKey = key
      continue
    }
    const unquoted = stripQuotes(value)
    ;(fm as Record<string, unknown>)[key] = unquoted
    openArrayKey = null
  }

  return { fm, body }
}

export type RawArticle = {
  source: NewsSource
  lang: "ja" | "en"
  slug: string
  fm: FrontMatter
  body: string
}

const SUMMARY_LIMIT = 180

export const stripHtmlTags = (value: string): string =>
  value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim()

export const extractSummary = (body: string): string | undefined => {
  const trimmed = body.replace(/^\s+/, "")
  if (trimmed === "") return undefined
  const firstBlock = trimmed.split(/\n\s*\n/, 1)[0] ?? ""
  const cleaned = firstBlock
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
  if (cleaned === "") return undefined
  if (cleaned.length <= SUMMARY_LIMIT) return cleaned

  return `${cleaned.slice(0, SUMMARY_LIMIT)}…`
}

const sanitizeDb = (db: readonly string[] | undefined): string[] => {
  if (!db) return []
  const out: string[] = []
  for (const raw of db) {
    const trimmed = raw.trim().toLowerCase()
    if (trimmed && !out.includes(trimmed)) out.push(trimmed)
  }

  return out
}

const isIsoDatetime = (value: string): boolean => {
  const parsed = new Date(value)

  return !Number.isNaN(parsed.getTime())
}

const toIsoDatetime = (value: string | undefined): string | undefined => {
  if (!value) return undefined
  const trimmed = value.trim()
  if (!isIsoDatetime(trimmed)) return undefined
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(trimmed)) return trimmed

  return new Date(trimmed).toISOString()
}

const pad2 = (n: number): string => String(n).padStart(2, "0")
const DBCLS_SLUG_RE = /^(\d{4})-(\d{2})-(\d{2})-post(\d+)$/i

export const dbclsDateFromSlug = (slug: string): string | undefined => {
  const m = DBCLS_SLUG_RE.exec(slug)
  if (!m) return undefined
  const [, y, mo, d, nStr] = m
  if (!y || !mo || !d || !nStr) return undefined
  const seq = Math.max(parseInt(nStr, 10) - 1, 0)
  const sod = Math.min(seq, 86399)
  const hours = Math.floor(sod / 3600)
  const minutes = Math.floor((sod % 3600) / 60)
  const seconds = sod % 60
  const jstIso = `${y}-${mo}-${d}T${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}+09:00`
  if (!isIsoDatetime(jstIso)) return undefined

  return jstIso
}

const isPublishedFalse = (value: string | undefined): boolean => {
  if (value === undefined) return false

  return value.trim().toLowerCase() === "false"
}

export type SourceUrlBuilder = (lang: "ja" | "en", slug: string) => string

export type SourceNormalizeConfig = {
  source: NewsSource
  urlBuilder: SourceUrlBuilder
  publishedAtFromSlug?: (slug: string) => string | undefined
}

const itemId = (source: NewsSource, slug: string): string => `${source}-${slug}`

export const toNewsItem = (
  cfg: SourceNormalizeConfig,
  ja: RawArticle | undefined,
  en: RawArticle | undefined,
  featured = false,
): NewsItem | undefined => {
  const primary = ja ?? en
  if (!primary) return undefined
  const jaUnpublished = ja !== undefined && isPublishedFalse(ja.fm.published)
  const enUnpublished = en !== undefined && isPublishedFalse(en.fm.published)
  if (
    (ja === undefined || jaUnpublished)
    && (en === undefined || enUnpublished)
  ) return undefined
  const slug = primary.slug
  const publishedAt = toIsoDatetime(primary.fm.date)
    ?? toIsoDatetime(en?.fm.date)
    ?? toIsoDatetime(ja?.fm.date)
    ?? cfg.publishedAtFromSlug?.(slug)
  if (!publishedAt) return undefined
  const retireTime = toIsoDatetime(primary.fm.retire_time)
    ?? toIsoDatetime(en?.fm.retire_time)
    ?? toIsoDatetime(ja?.fm.retire_time)
  const jaTags = ja?.fm.tags ?? []
  const enTags = en?.fm.tags ?? []
  const category = tagsToCategory(cfg.source, [...jaTags, ...enTags])
  const url = {
    ja: ja ? cfg.urlBuilder("ja", slug) : undefined,
    en: en ? cfg.urlBuilder("en", slug) : undefined,
  }
  const db = sanitizeDb(primary.fm.db?.length ? primary.fm.db : en?.fm.db ?? ja?.fm.db)
  const summaryJa = ja ? extractSummary(ja.body) : undefined
  const summaryEn = en ? extractSummary(en.body) : undefined
  const summary = summaryJa !== undefined || summaryEn !== undefined
    ? {
      ja: summaryJa ?? "",
      en: summaryEn ?? "",
    }
    : undefined

  return {
    id: itemId(cfg.source, slug),
    source: cfg.source,
    category,
    featured,
    publishedAt,
    ...(retireTime ? { retireTime } : {}),
    title: {
      ja: stripHtmlTags(ja?.fm.title ?? ""),
      en: stripHtmlTags(en?.fm.title ?? ""),
    },
    ...(summary ? { summary } : {}),
    ...(url.ja || url.en ? { url } : {}),
    db,
    rawTags: { ja: jaTags, en: enTags },
  }
}
