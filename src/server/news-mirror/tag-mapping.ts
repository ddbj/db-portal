import type { CanonicalTag, NewsSource } from "./types"

const TAG_MAPPING: Record<NewsSource, Readonly<Record<string, CanonicalTag>>> = {
  ddbj: {
    "Announcement": "announcement",
    "お知らせ": "announcement",
    "Data Release": "data-release",
    "データ公開": "data-release",
    "Maintenance": "maintenance",
    "メンテナンス": "maintenance",
  },
  dbcls: {
    public_relations: "announcement",
    services: "service",
    events: "event",
    registration: "recruitment",
    other: "other",
  },
}

export interface MapTagsResult {
  canonical: CanonicalTag[]
  dropped: string[]
}

export const mapTags = (rawTags: readonly string[], source: NewsSource): MapTagsResult => {
  const mapping = TAG_MAPPING[source]
  const canonical: CanonicalTag[] = []
  const dropped: string[] = []
  const seen = new Set<CanonicalTag>()
  for (const raw of rawTags) {
    const key = raw.trim()
    if (!key) continue
    const mapped = Object.hasOwn(mapping, key) ? mapping[key] : undefined
    if (mapped !== undefined) {
      if (!seen.has(mapped)) {
        seen.add(mapped)
        canonical.push(mapped)
      }
    } else {
      dropped.push(raw)
    }
  }

  return { canonical, dropped }
}
