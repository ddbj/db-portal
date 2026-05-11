import { buildFacets } from "./facets"
import type { MirroredNewsItem, NewsQuery, NewsQueryResult, NewsSnapshot } from "./types"

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

const isRetired = (item: MirroredNewsItem, now: Date): boolean => {
  if (!item.retireTime) return false

  return new Date(item.retireTime).getTime() < now.getTime()
}

const decodeCursor = (cursor: string | null | undefined): { dateTime: string; id: string } | null => {
  if (!cursor) return null
  try {
    const raw = Buffer.from(cursor, "base64url").toString("utf-8")
    const parsed: unknown = JSON.parse(raw)
    if (
      parsed
      && typeof parsed === "object"
      && "dateTime" in parsed
      && "id" in parsed
      && typeof (parsed as { dateTime: unknown }).dateTime === "string"
      && typeof (parsed as { id: unknown }).id === "string"
    ) {
      return parsed as { dateTime: string; id: string }
    }
  } catch {
    /* fall through */
  }

  return null
}

const encodeCursor = (item: MirroredNewsItem): string =>
  Buffer.from(JSON.stringify({ dateTime: item.dateTime, id: item.id }), "utf-8").toString("base64url")

export const queryNews = (snapshot: NewsSnapshot, q: NewsQuery, now: Date = new Date()): NewsQueryResult => {
  const lang = q.lang
  const dbSet = q.db && q.db.length > 0 ? new Set(q.db) : null
  const tagSet = q.tag && q.tag.length > 0 ? new Set(q.tag) : null
  const year = q.year ?? null
  const type = q.type ?? null
  const retired = q.retired ?? "0"
  const limit = Math.min(Math.max(q.limit ?? DEFAULT_LIMIT, 1), MAX_LIMIT)
  const cursor = decodeCursor(q.cursor)

  const langFiltered = snapshot.items.filter((item) => (lang ? item.lang === lang : true))

  const matchPredicates = (item: MirroredNewsItem): boolean => {
    if (dbSet && !item.db.some((d) => dbSet.has(d))) return false
    if (tagSet && !item.tags.some((t) => tagSet.has(t))) return false
    if (year && item.date.slice(0, 4) !== year) return false
    if (type && item.type !== type) return false
    if (retired === "0" && isRetired(item, now)) return false
    if (retired === "1" && !isRetired(item, now)) return false

    return true
  }

  const filtered = langFiltered.filter(matchPredicates)
  const facets = buildFacets(filtered)

  const startIndex = cursor
    ? filtered.findIndex((i) => i.dateTime === cursor.dateTime && i.id === cursor.id) + 1
    : 0
  const page = filtered.slice(startIndex, startIndex + limit)
  const last = page[page.length - 1]
  const nextCursor = last && startIndex + limit < filtered.length ? encodeCursor(last) : null

  return {
    hits: page,
    total: filtered.length,
    facets,
    builtAt: snapshot.builtAt,
    nextCursor,
  }
}
