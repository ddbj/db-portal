import { queryNews } from "./query"
import { getSnapshot } from "./store"
import type { NewsQuery, NewsQueryResult, NewsSnapshot } from "./types"

export const getMirrorSnapshot = (): NewsSnapshot | null => getSnapshot()

export const searchNews = (q: NewsQuery, now: Date = new Date()): NewsQueryResult => {
  const snapshot = getSnapshot()
  if (!snapshot) {
    return {
      hits: [],
      total: 0,
      facets: { year: [], source: [], db: [], tag: [], type: [] },
      builtAt: new Date(0).toISOString(),
      nextCursor: null,
    }
  }

  return queryNews(snapshot, q, now)
}

export type {
  CanonicalTag,
  MirroredNewsItem,
  NewsFacetBucket,
  NewsFacets,
  NewsQuery,
  NewsQueryResult,
  NewsSnapshot,
  NewsSource,
  NewsType,
} from "./types"
export { SUPPORTED_SOURCES, SUPPORTED_TAGS } from "./types"
export { ensureWorkerStarted, runOnce } from "./worker"
