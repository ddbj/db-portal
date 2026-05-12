import type { Lang } from "@/i18n"

export type NewsType = "notification" | "news"

export type NewsSource = "ddbj" | "dbcls"

export const SUPPORTED_SOURCES: readonly NewsSource[] = ["ddbj", "dbcls"] as const

export type CanonicalTag
  = | "announcement"
    | "data-release"
    | "maintenance"
    | "service"
    | "event"
    | "recruitment"
    | "other"

export const SUPPORTED_TAGS: readonly CanonicalTag[] = [
  "announcement",
  "data-release",
  "maintenance",
  "service",
  "event",
  "recruitment",
  "other",
] as const

export interface MirroredNewsItem {
  id: string
  source: NewsSource
  slug: string
  lang: Lang
  date: string
  dateTime: string
  retireTime: string | null
  db: string[]
  tags: CanonicalTag[]
  title: string
  bodyHtml: string
  sourceUrl: string
  sourceMdUrl: string
  type: NewsType
  pairId: string | null
}

export const NEWS_CACHE_SCHEMA_VERSION = 3 as const

export interface NewsSnapshot {
  items: MirroredNewsItem[]
  fileShas: Record<NewsSource, Record<string, string>>
  sourceShas: Record<NewsSource, string>
  builtAt: string
  schemaVersion: typeof NEWS_CACHE_SCHEMA_VERSION
}

export interface ParsedNewsItem {
  source: NewsSource
  slug: string
  lang: Lang
  filePath: string
  fileSha: string
  data: {
    title?: unknown
    date?: unknown
    retire_time?: unknown
    db?: unknown
    tags?: unknown
    lang?: unknown
    category?: unknown
    layout?: unknown
    published?: unknown
  }
  bodyMarkdown: string
}

export interface NewsQuery {
  lang?: Lang
  source?: NewsSource[]
  db?: string[]
  tag?: CanonicalTag[]
  year?: string
  type?: NewsType
  retired?: "0" | "1" | "all"
  limit?: number
  cursor?: string | null
}

export interface NewsFacetBucket {
  value: string
  count: number
}

export interface NewsFacets {
  year: NewsFacetBucket[]
  source: NewsFacetBucket[]
  db: NewsFacetBucket[]
  tag: NewsFacetBucket[]
  type: NewsFacetBucket[]
}

export interface NewsQueryResult {
  hits: MirroredNewsItem[]
  total: number
  facets: NewsFacets
  builtAt: string
  nextCursor: string | null
}
