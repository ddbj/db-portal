import type { NewsCategory, NewsItem } from "../../app/schemas/api-bff/news"
import { NewsCategory as NewsCategoryEnum } from "../../app/schemas/api-bff/news"

export { NewsCategory } from "../../app/schemas/api-bff/news"

const DEFAULT_CATEGORY: NewsCategory = "news"

const CATEGORY_PATTERNS: { category: Exclude<NewsCategory, "news">; patterns: RegExp[] }[] = [
  {
    category: "announcement",
    patterns: [/重要/, /^announcement$/i, /^notice$/i],
  },
  {
    category: "release",
    patterns: [/^リリース$/, /^release$/i, /^公開$/],
  },
  {
    category: "maintenance",
    patterns: [/メンテナンス/, /^maintenance$/i, /障害/, /復旧/, /^incident$/i],
  },
  {
    category: "event",
    patterns: [/^イベント$/, /^event$/i, /セミナー/, /^workshop$/i],
  },
]

export const tagsToCategory = (tags: readonly string[]): NewsCategory => {
  for (const tag of tags) {
    const trimmed = tag.trim()
    if (trimmed === "") continue
    for (const { category, patterns } of CATEGORY_PATTERNS) {
      if (patterns.some((p) => p.test(trimmed))) return category
    }
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

const ARRAY_KEYS = new Set(["db", "tags"])

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
    const arrayMatch = /^\s+-\s+(.+)$/.exec(line)
    if (arrayMatch && openArrayKey) {
      const value = stripQuotes((arrayMatch[1] ?? "").trim())
      const arr = fm[openArrayKey as keyof FrontMatter] as string[] | undefined
      if (arr) arr.push(value)
      continue
    }
    const kvMatch = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/.exec(line)
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

const ddbjNewsUrl = (lang: "ja" | "en", slug: string): string =>
  lang === "ja"
    ? `https://www.ddbj.nig.ac.jp/news/ja/${slug}.html`
    : `https://www.ddbj.nig.ac.jp/news/en/${slug}-e.html`

export type RawArticle = {
  lang: "ja" | "en"
  slug: string
  fm: FrontMatter
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

export const toNewsItem = (
  ja: RawArticle | undefined,
  en: RawArticle | undefined,
): NewsItem | undefined => {
  const primary = ja ?? en
  if (!primary) return undefined
  const slug = primary.slug
  const publishedAt = toIsoDatetime(primary.fm.date)
    ?? toIsoDatetime(en?.fm.date)
    ?? toIsoDatetime(ja?.fm.date)
  if (!publishedAt) return undefined
  const retireTime = toIsoDatetime(primary.fm.retire_time)
    ?? toIsoDatetime(en?.fm.retire_time)
    ?? toIsoDatetime(ja?.fm.retire_time)
  const jaTags = ja?.fm.tags ?? []
  const enTags = en?.fm.tags ?? []
  const category = tagsToCategory([...jaTags, ...enTags])
  const url = {
    ja: ja ? ddbjNewsUrl("ja", slug) : undefined,
    en: en ? ddbjNewsUrl("en", slug) : undefined,
  }
  const db = sanitizeDb(primary.fm.db?.length ? primary.fm.db : en?.fm.db ?? ja?.fm.db)

  return {
    id: slug,
    source: "ddbj",
    category,
    publishedAt,
    ...(retireTime ? { retireTime } : {}),
    title: {
      ja: ja?.fm.title?.trim() ?? "",
      en: en?.fm.title?.trim() ?? "",
    },
    ...(url.ja || url.en ? { url } : {}),
    db,
    rawTags: { ja: jaTags, en: enTags },
  }
}
