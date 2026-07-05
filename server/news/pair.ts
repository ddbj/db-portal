import type { NewsItem, NewsSource } from "../../app/schemas/api-bff/news"
import type { ParsedMarkdown, RawArticle, SourceNormalizeConfig } from "./normalize"
import { parseFrontMatter, toNewsItem } from "./normalize"

type SlugStripper = (lang: "ja" | "en", filename: string) => string | undefined

export type SourceParseConfig = SourceNormalizeConfig & {
  slugFromFilename: SlugStripper
}

export const ddbjSlugStripper: SlugStripper = (lang, filename) => {
  const noExt = filename.replace(/\.md$/i, "")
  if (!noExt) return undefined
  if (lang === "en") return noExt.replace(/-e$/, "")

  return noExt
}

const DBCLS_FILENAME_RE = /^(\d{4}-\d{2}-\d{2}-post\d+)\.md$/i

export const dbclsSlugStripper: SlugStripper = (_lang, filename) => {
  const m = filename.match(DBCLS_FILENAME_RE)

  return m?.[1] ?? undefined
}

export type LangRawMap = Map<string, RawArticle>

export const parseRawArticle = (
  source: NewsSource,
  lang: "ja" | "en",
  filename: string,
  markdown: string,
  slugStripper: SlugStripper,
): RawArticle | undefined => {
  const slug = slugStripper(lang, filename)
  if (!slug) return undefined
  const parsed: ParsedMarkdown | undefined = parseFrontMatter(markdown)
  if (!parsed) return undefined

  return { source, lang, slug, fm: parsed.fm, body: parsed.body }
}

export const pairToNewsItems = (
  cfg: SourceNormalizeConfig,
  ja: LangRawMap,
  en: LangRawMap,
  isFeatured?: (slug: string) => boolean,
): NewsItem[] => {
  const slugs = new Set<string>()
  for (const slug of ja.keys()) slugs.add(slug)
  for (const slug of en.keys()) slugs.add(slug)
  const items: NewsItem[] = []
  for (const slug of slugs) {
    const featured = isFeatured ? isFeatured(slug) : false
    const item = toNewsItem(cfg, ja.get(slug), en.get(slug), featured)
    if (item) items.push(item)
  }
  items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

  return items
}
