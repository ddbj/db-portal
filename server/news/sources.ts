import path from "node:path"

import type { NewsSource } from "../../app/schemas/api-bff/news"
import { dbclsDateFromSlug } from "./normalize"
import {
  dbclsSlugStripper,
  ddbjSlugStripper,
  type SourceParseConfig,
} from "./pair"

export type RepoSourceConfig = SourceParseConfig & {
  repoUrl: string
  branch: string
  localDir: string
  pathByLang: { ja: string; en: string }
  globalYamlPath?: string
}

const ddbjUrl = (lang: "ja" | "en", slug: string): string =>
  lang === "ja"
    ? `https://www.ddbj.nig.ac.jp/news/ja/${slug}.html`
    : `https://www.ddbj.nig.ac.jp/news/en/${slug}-e.html`

const DBCLS_SLUG_RE = /^(\d{4})-(\d{2})-(\d{2})-(post\d+)$/i

const dbclsUrl = (lang: "ja" | "en", slug: string): string => {
  const m = slug.match(DBCLS_SLUG_RE)
  if (!m) return "https://dbcls.rois.ac.jp/"
  const [, y, mo, d, title] = m

  return `https://dbcls.rois.ac.jp/${lang}/${y}/${mo}/${d}/${title}.html`
}

export const ddbjConfig = (
  repoUrl: string,
  branch: string,
  localDir: string,
): RepoSourceConfig => ({
  source: "ddbj",
  repoUrl,
  branch,
  localDir,
  pathByLang: {
    ja: path.join(localDir, "_news/ja"),
    en: path.join(localDir, "_news/en"),
  },
  globalYamlPath: path.join(localDir, "_data/global.yml"),
  urlBuilder: ddbjUrl,
  slugFromFilename: ddbjSlugStripper,
})

export const dbclsConfig = (
  repoUrl: string,
  branch: string,
  localDir: string,
): RepoSourceConfig => ({
  source: "dbcls",
  repoUrl,
  branch,
  localDir,
  pathByLang: {
    ja: path.join(localDir, "_posts/ja"),
    en: path.join(localDir, "_posts/en"),
  },
  urlBuilder: dbclsUrl,
  slugFromFilename: dbclsSlugStripper,
  publishedAtFromSlug: dbclsDateFromSlug,
})

export const knownSources: readonly NewsSource[] = ["ddbj", "dbcls"] as const
