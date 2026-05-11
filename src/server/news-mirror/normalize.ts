import type { Lang } from "@/i18n"

import { renderMarkdown } from "./parser"
import { EMPTY_TOP_NEWS, type TopNewsConfig } from "./top-news"
import type { MirroredNewsItem, NewsType, ParsedNewsItem } from "./types"

const DDBJ_WWW_BASE = "https://www.ddbj.nig.ac.jp"
const buildBlobBase = (): string => {
  const branch = process.env.NEWS_MIRROR_BRANCH ?? "main"

  return `https://github.com/ddbj/www/blob/${branch}`
}

const asStringArray = (v: unknown): string[] => {
  if (!Array.isArray(v)) return []

  return v
    .filter((x): x is string => typeof x === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

const asString = (v: unknown): string | null => {
  if (typeof v === "string") return v
  if (v instanceof Date) return v.toISOString()

  return null
}

const classifyBySlug = (slug: string, lang: Lang, topNews: TopNewsConfig): NewsType =>
  topNews[lang].has(slug) ? "notification" : "news"

const stripInlineHtml = (s: string): string =>
  s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()

const normalizeDate = (raw: string | null): { date: string; dateTime: string } | null => {
  if (!raw) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  const iso = d.toISOString()

  return { date: iso.slice(0, 10), dateTime: iso }
}

const buildSourceUrl = (slug: string, lang: Lang): string =>
  `${DDBJ_WWW_BASE}/news/${lang}/${slug}.html`

const buildSourceMdUrl = (filePath: string): string =>
  `${buildBlobBase()}/${filePath}`

export const SUPPORTED_LANGS: readonly Lang[] = ["ja", "en"] as const

export interface NormalizeWarning {
  filePath: string
  reason: string
}

interface NormalizeOutcome {
  item: MirroredNewsItem | null
  warning: NormalizeWarning | null
}

const normalizeOne = async (parsed: ParsedNewsItem, topNews: TopNewsConfig): Promise<NormalizeOutcome> => {
  const title = asString(parsed.data.title)
  if (!title) {
    return {
      item: null,
      warning: { filePath: parsed.filePath, reason: "missing title" },
    }
  }

  const dateInfo = normalizeDate(asString(parsed.data.date))
  if (!dateInfo) {
    return {
      item: null,
      warning: { filePath: parsed.filePath, reason: "missing or invalid date" },
    }
  }

  const retireRaw = asString(parsed.data.retire_time)
  const retireInfo = retireRaw ? normalizeDate(retireRaw) : null
  const tags = asStringArray(parsed.data.tags)
  const db = asStringArray(parsed.data.db)
  const bodyHtml = await renderMarkdown(parsed.bodyMarkdown)

  const item: MirroredNewsItem = {
    id: `${parsed.lang}-${parsed.slug}`,
    slug: parsed.slug,
    lang: parsed.lang,
    date: dateInfo.date,
    dateTime: dateInfo.dateTime,
    retireTime: retireInfo?.dateTime ?? null,
    db,
    tags,
    title: stripInlineHtml(title),
    bodyHtml,
    sourceUrl: buildSourceUrl(parsed.slug, parsed.lang),
    sourceMdUrl: buildSourceMdUrl(parsed.filePath),
    type: classifyBySlug(parsed.slug, parsed.lang, topNews),
    pairId: null,
  }

  return { item, warning: null }
}

export const linkPairs = (items: MirroredNewsItem[]): void => {
  for (const item of items) item.pairId = null
  const bySlug = new Map<string, { ja?: MirroredNewsItem; en?: MirroredNewsItem }>()
  for (const item of items) {
    const entry = bySlug.get(item.slug) ?? {}
    entry[item.lang] = item
    bySlug.set(item.slug, entry)
  }
  for (const { ja, en } of bySlug.values()) {
    if (ja && en) {
      ja.pairId = en.id
      en.pairId = ja.id
    }
  }
}

export const sortItemsByDateDesc = (items: MirroredNewsItem[]): void => {
  items.sort((a, b) => (a.dateTime < b.dateTime ? 1 : a.dateTime > b.dateTime ? -1 : 0))
}

export interface NormalizeResult {
  items: MirroredNewsItem[]
  warnings: NormalizeWarning[]
}

export const normalizeAll = async (
  parsed: ParsedNewsItem[],
  topNews: TopNewsConfig = EMPTY_TOP_NEWS,
): Promise<NormalizeResult> => {
  const outcomes = await Promise.all(parsed.map((p) => normalizeOne(p, topNews)))
  const items: MirroredNewsItem[] = []
  const warnings: NormalizeWarning[] = []
  for (const { item, warning } of outcomes) {
    if (item) items.push(item)
    if (warning) warnings.push(warning)
  }
  linkPairs(items)
  sortItemsByDateDesc(items)

  return { items, warnings }
}

export { classifyBySlug }
