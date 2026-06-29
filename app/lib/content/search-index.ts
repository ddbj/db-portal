import MiniSearch from "minisearch"

import type { PageContent } from "~/schemas/content/page-content"
import type { TocHeading } from "~/schemas/content/toc-heading"

import { listAllPages } from "./markdown-loader"

export type SearchResult = {
  /** "page" hit = full-page match. "section" hit = match within one h2 section. */
  kind: "page" | "section"
  /** Unique result id. For page: page urlPath. For section: page urlPath + "#" + anchor. */
  urlPath: string
  /** Parent page urlPath, never includes the anchor. */
  pageUrlPath: string
  /** Row title: page title for page hits, h2 text for section hits. */
  title: string
  /** Always the page's frontmatter title (used to render the page context line). */
  pageTitle: string
  description: string
  section: string
  slug: string
  score: number
  snippet: string
  /** Present when kind === "section". */
  anchor?: string
}

type IndexDoc = {
  id: string
  kind: "page" | "section"
  title: string
  pageTitle: string
  description: string
  body: string
  section: string
  slug: string
  pageUrlPath: string
  anchor?: string
}

const STRIP_HTML_RE = /<[^>]+>/g
const COLLAPSE_WS_RE = /\s+/g

const stripHtml = (html: string): string =>
  html.replace(STRIP_HTML_RE, " ").replace(COLLAPSE_WS_RE, " ").trim()

// hit term を snippet の先頭付近に置いて line-clamp-1 でも見えるようにする非対称ウィンドウ
const SNIPPET_PREFIX = 25
const SNIPPET_SUFFIX = 125

const buildSnippet = (body: string, query: string): string => {
  const lower = body.toLowerCase()
  const queryLower = query.toLowerCase()
  const terms = queryLower.split(/\s+/).filter(Boolean)
  let pos = -1
  for (const term of terms) {
    pos = lower.indexOf(term)
    if (pos >= 0) break
  }
  if (pos < 0) return body.slice(0, SNIPPET_PREFIX + SNIPPET_SUFFIX)

  const start = Math.max(0, pos - SNIPPET_PREFIX)
  const end = Math.min(body.length, pos + SNIPPET_SUFFIX)
  const prefix = start > 0 ? "…" : ""
  const suffix = end < body.length ? "…" : ""

  return `${prefix}${body.slice(start, end)}${suffix}`
}

const extractSection = (urlPath: string): string =>
  urlPath.split("/").filter(Boolean)[0] ?? ""

const H2_TAG_RE = /<h2\b[^>]*\bid="([^"]+)"[^>]*>/g

type HtmlSection = { anchor: string; html: string }

/** Split the rendered HTML body into per-h2 sections keyed by the h2's id. */
const splitHtmlByH2 = (html: string, validIds: ReadonlySet<string>): HtmlSection[] => {
  const matches = Array.from(html.matchAll(H2_TAG_RE))
  const sections: HtmlSection[] = []
  for (const [i, m] of matches.entries()) {
    const id = m[1]
    if (id === undefined || !validIds.has(id)) continue
    const start = m.index ?? 0
    const next = matches[i + 1]
    const end = next !== undefined ? next.index ?? html.length : html.length
    sections.push({ anchor: id, html: html.slice(start, end) })
  }

  return sections
}

const buildDocs = (pages: readonly PageContent[], lang: "ja" | "en"): IndexDoc[] => {
  const docs: IndexDoc[] = []
  for (const p of pages) {
    if (p.urlPath.startsWith("/_dev")) continue
    const fm = lang === "en" && p.frontmatter.en ? p.frontmatter.en : p.frontmatter.ja
    const html = lang === "en" && p.html.en ? p.html.en : p.html.ja
    const tocList: readonly TocHeading[]
      = lang === "en" && p.toc.en ? p.toc.en : p.toc.ja
    const h2Headings = tocList.filter((h) => h.depth === 2)
    const h2Texts = new Map(h2Headings.map((h) => [h.id, h.text]))
    const h2Ids = new Set(h2Headings.map((h) => h.id))
    const section = extractSection(p.urlPath)

    docs.push({
      id: p.urlPath,
      kind: "page",
      title: fm.title,
      pageTitle: fm.title,
      description: fm.description,
      body: stripHtml(html),
      section,
      slug: p.slug,
      pageUrlPath: p.urlPath,
    })

    for (const sec of splitHtmlByH2(html, h2Ids)) {
      docs.push({
        id: `${p.urlPath}#${sec.anchor}`,
        kind: "section",
        title: h2Texts.get(sec.anchor) ?? sec.anchor,
        pageTitle: fm.title,
        description: fm.description,
        body: stripHtml(sec.html),
        section,
        slug: p.slug,
        pageUrlPath: p.urlPath,
        anchor: sec.anchor,
      })
    }
  }

  return docs
}

const createIndex = (docs: IndexDoc[]): MiniSearch<IndexDoc> => {
  const index = new MiniSearch<IndexDoc>({
    fields: ["title", "description", "body"],
    storeFields: [
      "kind",
      "title",
      "pageTitle",
      "description",
      "body",
      "section",
      "slug",
      "pageUrlPath",
      "anchor",
    ],
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

  return raw.map((r) => {
    const kind = r.kind as "page" | "section"
    const pageUrlPath = r.pageUrlPath as string
    const anchor = r.anchor as string | undefined
    const body = r.body as string

    return {
      kind,
      urlPath: kind === "section" && anchor !== undefined
        ? `${pageUrlPath}#${anchor}`
        : pageUrlPath,
      pageUrlPath,
      title: r.title as string,
      pageTitle: r.pageTitle as string,
      description: r.description as string,
      section: r.section as string,
      slug: r.slug as string,
      score: r.score,
      snippet: buildSnippet(body, trimmed),
      ...(anchor !== undefined ? { anchor } : {}),
    }
  })
}
