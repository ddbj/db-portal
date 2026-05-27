import { readFile } from "node:fs/promises"

import yaml from "js-yaml"
import { z } from "zod"

import type { NewsSource } from "../../app/schemas/api-bff/news"
import type { Logger } from "../lib/log"
import { ddbjSlugStripper } from "./pair"

const TopNewsEntry = z.object({ path: z.string() })
const TopNewsYaml = z.object({
  top_news: z.object({
    ja: z.array(TopNewsEntry).default([]),
    en: z.array(TopNewsEntry).default([]),
  }).default({ ja: [], en: [] }),
}).passthrough()

export type FeaturedWhitelist = {
  ja: ReadonlySet<string>
  en: ReadonlySet<string>
}

export const emptyWhitelist = (): FeaturedWhitelist => ({
  ja: new Set<string>(),
  en: new Set<string>(),
})

export const loadFeaturedWhitelist = async (
  globalYamlPath: string,
  logger: Logger,
): Promise<FeaturedWhitelist> => {
  let raw: string
  try {
    raw = await readFile(globalYamlPath, "utf8")
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code !== "ENOENT") {
      logger.warn("featured_whitelist_read_failed", { code: code ?? "unknown" })
    }

    return emptyWhitelist()
  }
  let parsed: unknown
  try {
    // JSON_SCHEMA keeps ISO-like date scalars (e.g. `path: 2026-05-01`) as plain strings
    // instead of constructing Date objects, which zod's z.string() rejects.
    parsed = yaml.load(raw, { schema: yaml.JSON_SCHEMA })
  } catch (error) {
    logger.warn("featured_whitelist_yaml_parse_failed", {
      message: error instanceof Error ? error.message : String(error),
    })

    return emptyWhitelist()
  }
  const result = TopNewsYaml.safeParse(parsed)
  if (!result.success) {
    logger.warn("featured_whitelist_schema_mismatch", { issues: result.error.issues.length })

    return emptyWhitelist()
  }
  const toSet = (entries: readonly { path: string }[]): ReadonlySet<string> => {
    const set = new Set<string>()
    for (const entry of entries) {
      const trimmed = entry.path.trim()
      if (trimmed) set.add(trimmed)
    }

    return set
  }

  return {
    ja: toSet(result.data.top_news.ja),
    en: toSet(result.data.top_news.en),
  }
}

const stripDdbjEnSuffix = (path: string): string => {
  const internal = ddbjSlugStripper("en", `${path}.md`)

  return internal ?? path
}

export const isFeaturedSlug = (
  source: NewsSource,
  internalSlug: string,
  whitelist: FeaturedWhitelist,
): boolean => {
  if (source !== "ddbj") return false
  if (whitelist.ja.has(internalSlug)) return true
  for (const enPath of whitelist.en) {
    if (stripDdbjEnSuffix(enPath) === internalSlug) return true
  }

  return false
}
