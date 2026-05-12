import {
  type CanonicalTag,
  type NewsSource,
  SUPPORTED_SOURCES,
  SUPPORTED_TAGS,
} from "./types"

export const parseCsvList = (value: string | null): string[] => {
  if (!value) return []

  return value.split(",").map((s) => s.trim()).filter((s) => s.length > 0)
}

export const parseSourceList = (value: string | null): NewsSource[] => {
  const list = parseCsvList(value)
  const validSet = new Set<string>(SUPPORTED_SOURCES)

  return list.filter((v): v is NewsSource => validSet.has(v))
}

export const parseCanonicalTagList = (value: string | null): CanonicalTag[] => {
  const list = parseCsvList(value)
  const validSet = new Set<string>(SUPPORTED_TAGS)

  return list.filter((v): v is CanonicalTag => validSet.has(v))
}
