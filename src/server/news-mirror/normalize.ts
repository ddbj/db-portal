import type { Lang } from "@/i18n"

import { renderMarkdown } from "./parser"
import type { NewsSourceConfig } from "./sources"
import { mapTags } from "./tag-mapping"
import { EMPTY_TOP_NEWS, type TopNewsConfig } from "./top-news"
import type { MirroredNewsItem, NewsType, ParsedNewsItem } from "./types"

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

const stripInlineHtml = (s: string): string =>
  s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim()

const classifyBySlug = (slug: string, lang: Lang, topNews: TopNewsConfig): NewsType =>
  topNews[lang].has(slug) ? "notification" : "news"

const normalizeDate = (raw: string | null): { date: string; dateTime: string } | null => {
  if (!raw) return null
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return null
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})/)

  return { date: m?.[1] ?? d.toISOString().slice(0, 10), dateTime: d.toISOString() }
}

const pad2 = (n: number): string => String(n).padStart(2, "0")

const dbclsDateFromSlug = (slug: string): { date: string; dateTime: string } | null => {
  const m = slug.match(/^(\d{4})-(\d{2})-(\d{2})-post(\d+)$/i)
  if (!m) return null
  const [, y, mo, d, nStr] = m
  if (y === undefined || mo === undefined || d === undefined || nStr === undefined) return null
  const seq = Math.max(parseInt(nStr, 10) - 1, 0)
  const hours = Math.min(Math.floor(seq / 3600), 23)
  const minutes = Math.floor((seq % 3600) / 60)
  const seconds = seq % 60
  const jstIso = `${y}-${mo}-${d}T${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}+09:00`
  const date = new Date(jstIso)
  if (Number.isNaN(date.getTime())) return null
  const iso = date.toISOString()

  return { date: `${y}-${mo}-${d}`, dateTime: iso }
}

const computeDate = (
  cfg: NewsSourceConfig,
  parsed: ParsedNewsItem,
): { date: string; dateTime: string } | null => {
  if (cfg.source === "dbcls") return dbclsDateFromSlug(parsed.slug)

  return normalizeDate(asString(parsed.data.date))
}

const classify = (
  cfg: NewsSourceConfig,
  parsed: ParsedNewsItem,
  topNews: TopNewsConfig,
): NewsType => {
  if (cfg.source === "ddbj") return classifyBySlug(parsed.slug, parsed.lang, topNews)

  return "news"
}

export const SUPPORTED_LANGS: readonly Lang[] = ["ja", "en"] as const

export interface NormalizeWarning {
  filePath: string
  reason: string
}

export interface DroppedTagsRecord {
  filePath: string
  tags: string[]
}

interface NormalizeOutcome {
  item: MirroredNewsItem | null
  warning: NormalizeWarning | null
  droppedTags: string[]
}

const normalizeOne = async (
  cfg: NewsSourceConfig,
  parsed: ParsedNewsItem,
  topNews: TopNewsConfig,
): Promise<NormalizeOutcome> => {
  if (cfg.source === "dbcls" && parsed.data.published === false) {
    return {
      item: null,
      warning: { filePath: parsed.filePath, reason: "published: false" },
      droppedTags: [],
    }
  }

  const title = asString(parsed.data.title)
  if (!title) {
    return {
      item: null,
      warning: { filePath: parsed.filePath, reason: "missing title" },
      droppedTags: [],
    }
  }

  const dateInfo = computeDate(cfg, parsed)
  if (!dateInfo) {
    return {
      item: null,
      warning: { filePath: parsed.filePath, reason: "missing or invalid date" },
      droppedTags: [],
    }
  }

  const retireRaw = cfg.source === "ddbj" ? asString(parsed.data.retire_time) : null
  const retireInfo = retireRaw ? normalizeDate(retireRaw) : null
  const rawTags = asStringArray(parsed.data.tags)
  const { canonical: tags, dropped: droppedTags } = mapTags(rawTags, cfg.source)
  const db = cfg.source === "ddbj" ? asStringArray(parsed.data.db) : []
  const bodyHtml = await renderMarkdown(parsed.bodyMarkdown)

  const item: MirroredNewsItem = {
    id: `${cfg.source}-${parsed.lang}-${parsed.slug}`,
    source: cfg.source,
    slug: parsed.slug,
    lang: parsed.lang,
    date: dateInfo.date,
    dateTime: dateInfo.dateTime,
    retireTime: retireInfo?.dateTime ?? null,
    db,
    tags,
    title: stripInlineHtml(title),
    bodyHtml,
    sourceUrl: cfg.buildSourceUrl(parsed.slug, parsed.lang),
    sourceMdUrl: cfg.buildSourceMdUrl(parsed.filePath),
    type: classify(cfg, parsed, topNews),
    pairId: null,
  }

  return { item, warning: null, droppedTags }
}

export const linkPairs = (items: MirroredNewsItem[]): void => {
  for (const item of items) item.pairId = null
  const bySlug = new Map<string, { ja?: MirroredNewsItem; en?: MirroredNewsItem }>()
  for (const item of items) {
    const key = `${item.source}:${item.slug}`
    const entry = bySlug.get(key) ?? {}
    entry[item.lang] = item
    bySlug.set(key, entry)
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
  droppedTags: DroppedTagsRecord[]
}

export const normalizeAll = async (
  cfg: NewsSourceConfig,
  parsed: ParsedNewsItem[],
  topNews: TopNewsConfig = EMPTY_TOP_NEWS,
): Promise<NormalizeResult> => {
  const outcomes = await Promise.all(parsed.map((p) => normalizeOne(cfg, p, topNews)))
  const items: MirroredNewsItem[] = []
  const warnings: NormalizeWarning[] = []
  const droppedTags: DroppedTagsRecord[] = []
  for (let i = 0; i < outcomes.length; i++) {
    const oc = outcomes[i]
    const src = parsed[i]
    if (!oc || !src) continue
    if (oc.item) items.push(oc.item)
    if (oc.warning) warnings.push(oc.warning)
    if (oc.droppedTags.length > 0) {
      droppedTags.push({ filePath: src.filePath, tags: oc.droppedTags })
    }
  }

  return { items, warnings, droppedTags }
}

export { classifyBySlug, dbclsDateFromSlug }
