import type { NewsSource } from "../../app/schemas/api-bff/news"
import { dbclsDateFromSlug } from "./normalize"
import {
  dbclsSlugStripper,
  ddbjSlugStripper,
  type SourceParseConfig,
} from "./pair"

export type GitHubSourceConfig = SourceParseConfig & {
  repo: string
  branch: string
  pathByLang: { ja: string; en: string }
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

export const ddbjConfig = (repo: string, branch: string): GitHubSourceConfig => ({
  source: "ddbj",
  repo,
  branch,
  pathByLang: { ja: "_news/ja", en: "_news/en" },
  urlBuilder: ddbjUrl,
  slugFromFilename: ddbjSlugStripper,
})

export const dbclsConfig = (repo: string, branch: string): GitHubSourceConfig => ({
  source: "dbcls",
  repo,
  branch,
  pathByLang: { ja: "_posts/ja", en: "_posts/en" },
  urlBuilder: dbclsUrl,
  slugFromFilename: dbclsSlugStripper,
  publishedAtFromSlug: dbclsDateFromSlug,
})

export const knownSources: readonly NewsSource[] = ["ddbj", "dbcls"] as const
