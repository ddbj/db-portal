import type { Lang } from "@/i18n"

export type NewsType = "notification" | "news"

export interface MirroredNewsItem {
  id: string
  slug: string
  lang: Lang
  date: string
  dateTime: string
  retireTime: string | null
  db: string[]
  tags: string[]
  title: string
  bodyHtml: string
  sourceUrl: string
  sourceMdUrl: string
  type: NewsType
  pairId: string | null
}

export const NEWS_CACHE_SCHEMA_VERSION = 2 as const

export interface NewsSnapshot {
  items: MirroredNewsItem[]
  fileShas: Record<string, string>
  builtAt: string
  sourceSha: string
  schemaVersion: typeof NEWS_CACHE_SCHEMA_VERSION
}

export interface ParsedNewsItem {
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
  }
  bodyMarkdown: string
}

export interface NewsQuery {
  lang?: Lang
  db?: string[]
  tag?: string[]
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
