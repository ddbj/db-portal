import yaml from "js-yaml"

import type { Lang } from "@/i18n"

export interface TopNewsConfig {
  ja: ReadonlySet<string>
  en: ReadonlySet<string>
}

export const EMPTY_TOP_NEWS: TopNewsConfig = {
  ja: new Set<string>(),
  en: new Set<string>(),
}

const pathToString = (path: unknown): string | null => {
  if (typeof path === "string") return path
  if (path instanceof Date && !Number.isNaN(path.getTime())) {
    return path.toISOString().slice(0, 10)
  }

  return null
}

const stripSlug = (path: string, lang: Lang): string => {
  const trimmed = path.trim().replace(/\.html?$/i, "")
  if (lang === "en" && trimmed.endsWith("-e")) return trimmed.slice(0, -2)

  return trimmed
}

export const parseGlobalYaml = (raw: string): TopNewsConfig => {
  const parsed: unknown = yaml.load(raw)
  if (!parsed || typeof parsed !== "object") return EMPTY_TOP_NEWS
  const root = parsed as { top_news?: unknown }
  const topNews = root.top_news
  if (!topNews || typeof topNews !== "object") return EMPTY_TOP_NEWS
  const byLang = topNews as { ja?: unknown; en?: unknown }
  const collect = (entries: unknown, lang: Lang): Set<string> => {
    if (!Array.isArray(entries)) return new Set()
    const out = new Set<string>()
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") continue
      const path = pathToString((entry as { path?: unknown }).path)
      if (path === null) continue
      out.add(stripSlug(path, lang))
    }

    return out
  }

  return {
    ja: collect(byLang.ja, "ja"),
    en: collect(byLang.en, "en"),
  }
}
