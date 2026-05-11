import type { MirroredNewsItem, NewsFacetBucket, NewsFacets, NewsType } from "./types"

const NEWS_TYPES: readonly NewsType[] = ["notification", "news"] as const

const tally = (items: MirroredNewsItem[], pick: (i: MirroredNewsItem) => string[]): NewsFacetBucket[] => {
  const counts = new Map<string, number>()
  for (const item of items) {
    for (const value of pick(item)) {
      counts.set(value, (counts.get(value) ?? 0) + 1)
    }
  }

  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value))
}

export const buildFacets = (items: MirroredNewsItem[]): NewsFacets => ({
  year: tally(items, (i) => [i.date.slice(0, 4)]).sort((a, b) => b.value.localeCompare(a.value)),
  db: tally(items, (i) => i.db),
  tag: tally(items, (i) => i.tags),
  type: NEWS_TYPES.map((t) => ({ value: t, count: items.filter((i) => i.type === t).length })),
})
