import type { NewsItem } from "../../app/schemas/api-bff/news"
import type { ParsedMarkdown, RawArticle } from "./normalize"
import { parseFrontMatter, toNewsItem } from "./normalize"

export const slugFromFilename = (lang: "ja" | "en", filename: string): string => {
  const withoutExt = filename.replace(/\.md$/, "")
  if (lang === "en") return withoutExt.replace(/-e$/, "")

  return withoutExt
}

export type LangRawMap = Map<string, RawArticle>

export const parseRawArticle = (
  lang: "ja" | "en",
  filename: string,
  markdown: string,
): RawArticle | undefined => {
  const parsed: ParsedMarkdown | undefined = parseFrontMatter(markdown)
  if (!parsed) return undefined

  return {
    lang,
    slug: slugFromFilename(lang, filename),
    fm: parsed.fm,
  }
}

export const pairToNewsItems = (
  ja: LangRawMap,
  en: LangRawMap,
): NewsItem[] => {
  const slugs = new Set<string>()
  for (const slug of ja.keys()) slugs.add(slug)
  for (const slug of en.keys()) slugs.add(slug)
  const items: NewsItem[] = []
  for (const slug of slugs) {
    const item = toNewsItem(ja.get(slug), en.get(slug))
    if (item) items.push(item)
  }
  items.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))

  return items
}
