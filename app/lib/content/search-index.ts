import MiniSearch from "minisearch"

import type { PageContent } from "~/schemas/content/page-content"

import { listAllPages } from "./markdown-loader"

export type SearchResult = {
  urlPath: string
  title: string
  description: string
  section: string
  slug: string
  score: number
  snippet: string
}

type IndexDoc = {
  id: string
  title: string
  description: string
  body: string
  section: string
  slug: string
  urlPath: string
}

const STRIP_HTML_RE = /<[^>]+>/g
const COLLAPSE_WS_RE = /\s+/g

const stripHtml = (html: string): string =>
  html.replace(STRIP_HTML_RE, " ").replace(COLLAPSE_WS_RE, " ").trim()

const SNIPPET_RADIUS = 75

const buildSnippet = (body: string, query: string): string => {
  const lower = body.toLowerCase()
  const queryLower = query.toLowerCase()
  const terms = queryLower.split(/\s+/).filter(Boolean)
  let pos = -1
  for (const term of terms) {
    pos = lower.indexOf(term)
    if (pos >= 0) break
  }
  if (pos < 0) return body.slice(0, SNIPPET_RADIUS * 2)

  const start = Math.max(0, pos - SNIPPET_RADIUS)
  const end = Math.min(body.length, pos + SNIPPET_RADIUS)
  const prefix = start > 0 ? "…" : ""
  const suffix = end < body.length ? "…" : ""

  return `${prefix}${body.slice(start, end)}${suffix}`
}

const extractSection = (urlPath: string): string =>
  urlPath.split("/").filter(Boolean)[0] ?? ""

const buildDocs = (pages: readonly PageContent[], lang: "ja" | "en"): IndexDoc[] =>
  pages
    .filter((p) => !p.urlPath.startsWith("/_dev"))
    .map((p) => {
      const fm = lang === "en" && p.frontmatter.en ? p.frontmatter.en : p.frontmatter.ja
      const html = lang === "en" && p.html.en ? p.html.en : p.html.ja

      return {
        id: p.urlPath,
        title: fm.title,
        description: fm.description,
        body: stripHtml(html),
        section: extractSection(p.urlPath),
        slug: p.slug,
        urlPath: p.urlPath,
      }
    })

const createIndex = (docs: IndexDoc[]): MiniSearch<IndexDoc> => {
  const index = new MiniSearch<IndexDoc>({
    fields: ["title", "description", "body"],
    storeFields: ["title", "description", "section", "slug", "urlPath"],
    searchOptions: {
      boost: { title: 3, description: 2 },
      prefix: true,
      fuzzy: 0.2,
    },
  })
  index.addAll(docs)

  return index
}

let jaIndex: MiniSearch<IndexDoc> | undefined
let enIndex: MiniSearch<IndexDoc> | undefined

const getIndex = (lang: "ja" | "en"): MiniSearch<IndexDoc> => {
  if (lang === "en") {
    if (enIndex === undefined) enIndex = createIndex(buildDocs(listAllPages(), "en"))

    return enIndex
  }
  if (jaIndex === undefined) jaIndex = createIndex(buildDocs(listAllPages(), "ja"))

  return jaIndex
}

export const searchContent = (query: string, lang: "ja" | "en"): SearchResult[] => {
  const trimmed = query.trim()
  if (trimmed === "") return []

  const index = getIndex(lang)
  const raw = index.search(trimmed)

  return raw.map((r) => ({
    urlPath: r.urlPath as string,
    title: r.title as string,
    description: r.description as string,
    section: r.section as string,
    slug: r.slug as string,
    score: r.score,
    snippet: buildSnippet(
      stripHtml(
        (() => {
          const page = listAllPages().find((p) => p.urlPath === r.id)
          if (!page) return ""
          const html = lang === "en" && page.html.en ? page.html.en : page.html.ja

          return html
        })(),
      ),
      trimmed,
    ),
  }))
}
