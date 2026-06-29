import type { PageLastUpdated } from "~/schemas/content/page-content"

type LastUpdatedMap = Record<string, PageLastUpdated>

const modules = import.meta.glob<{ default: LastUpdatedMap }>(
  "./gen/last-updated.json",
  { eager: true },
)

const map: LastUpdatedMap = Object.values(modules)[0]?.default ?? {}

export const getLastUpdated = (urlPath: string): PageLastUpdated | undefined => {
  const entry = map[urlPath]
  if (!entry) return undefined
  if (entry.ja === undefined && entry.en === undefined) return undefined

  return entry
}
