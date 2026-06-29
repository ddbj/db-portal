import type { PageContent } from "~/schemas/content/page-content"
import { PageFrontmatter } from "~/schemas/content/page-content"

import { getLastUpdated } from "./get-last-updated"
import { extractHeadings } from "./heading-extractor"
import { markdownToHtml } from "./markdown-pipeline"
import type { ValidationFailure, ValidationResult } from "./types"

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/

const splitFrontmatter = (raw: string): { data: Record<string, string>; content: string } => {
  const match = raw.match(FRONTMATTER_RE)
  if (!match) return { data: {}, content: raw }
  const yaml = match[1] ?? ""
  const content = match[2] ?? ""
  const data: Record<string, string> = {}
  for (const line of yaml.split("\n")) {
    const m = line.match(/^(\w+):\s*(.+)$/)
    if (m && m[1] !== undefined && m[2] !== undefined) {
      data[m[1]] = m[2].trim()
    }
  }

  return { data, content }
}

type RawModule = Record<string, string>

const allMdModules: RawModule = import.meta.glob(
  "/page-contents/**/*.md",
  { eager: true, query: "?raw", import: "default" },
)

const isEnglishFile = (filepath: string): boolean => filepath.endsWith(".en.md")

const jaModules: RawModule = Object.fromEntries(
  Object.entries(allMdModules).filter(([fp]) => !isEnglishFile(fp)),
)

const enModules: RawModule = Object.fromEntries(
  Object.entries(allMdModules).filter(([fp]) => isEnglishFile(fp)),
)

const PREFIX = "/page-contents/"

// `index.md` は親 dir の URL に畳む。`foo.md` はそのファイル名で URL の最後の
// segment になる。英語版は同じ URL に `.en` 拡張子だけ差をつけて並ぶ。
const extractUrlPath = (filepath: string): string => {
  const rel = filepath.slice(PREFIX.length)
  const stripped = rel
    .replace(/\/index\.en\.md$/, "")
    .replace(/\/index\.md$/, "")
    .replace(/\.en\.md$/, "")
    .replace(/\.md$/, "")

  return `/${stripped}`
}

const extractSlug = (urlPath: string): string => {
  const segments = urlPath.split("/").filter(Boolean)

  return segments[segments.length - 1] ?? ""
}

const parseFrontmatter = (
  raw: string,
  filepath: string,
): { frontmatter: PageFrontmatter; body: string } | { error: ValidationFailure } => {
  const { data, content } = splitFrontmatter(raw)
  const parsed = PageFrontmatter.safeParse(data)
  if (!parsed.success) {
    return { error: { filepath, error: parsed.error } }
  }

  return { frontmatter: parsed.data, body: content }
}

type BuildEntry = {
  urlPath: string
  slug: string
  jaFilepath: string
  enFilepath?: string
  ja: { frontmatter: PageFrontmatter; body: string }
  en?: { frontmatter: PageFrontmatter; body: string }
}

const buildEntries = (): { entries: BuildEntry[]; errors: ValidationFailure[] } => {
  const errors: ValidationFailure[] = []
  const entryMap = new Map<string, BuildEntry>()

  for (const [filepath, raw] of Object.entries(jaModules)) {
    const urlPath = extractUrlPath(filepath)
    const result = parseFrontmatter(raw, filepath)
    if ("error" in result) {
      errors.push(result.error)
      continue
    }
    entryMap.set(urlPath, {
      urlPath,
      slug: extractSlug(urlPath),
      jaFilepath: filepath,
      ja: result,
    })
  }

  for (const [filepath, raw] of Object.entries(enModules)) {
    const urlPath = extractUrlPath(filepath)
    const result = parseFrontmatter(raw, filepath)
    if ("error" in result) {
      errors.push(result.error)
      continue
    }
    const existing = entryMap.get(urlPath)
    if (existing) {
      existing.en = result
      existing.enFilepath = filepath
    }
  }

  return { entries: Array.from(entryMap.values()), errors }
}

const stripLeadingSlash = (filepath: string): string => filepath.replace(/^\//, "")

const renderEntries = (entries: BuildEntry[]): PageContent[] =>
  entries.map((entry) => ({
    slug: entry.slug,
    urlPath: entry.urlPath,
    sourcePath: {
      ja: stripLeadingSlash(entry.jaFilepath),
      en: entry.enFilepath ? stripLeadingSlash(entry.enFilepath) : undefined,
    },
    frontmatter: {
      ja: entry.ja.frontmatter,
      en: entry.en?.frontmatter,
    },
    html: {
      ja: markdownToHtml(entry.ja.body),
      en: entry.en ? markdownToHtml(entry.en.body) : undefined,
    },
    toc: {
      ja: extractHeadings(entry.ja.body),
      en: entry.en ? extractHeadings(entry.en.body) : undefined,
    },
    lastUpdated: getLastUpdated(entry.urlPath),
  }))

const { entries, errors: buildErrors } = buildEntries()
if (buildErrors.length > 0) {
  const messages = buildErrors.map((e) => {
    const issues = e.error.issues.map((i) => `  ${i.path.join(".") || "<root>"}: ${i.message}`)

    return `${e.filepath}\n${issues.join("\n")}`
  })
  throw new Error(
    `Page content validation failed:\n\n${messages.join("\n\n")}`,
  )
}

const pages = renderEntries(entries)

const pageByPath = new Map<string, PageContent>()

for (const page of pages) {
  pageByPath.set(page.urlPath, page)
}

export const getPageByPath = (urlPath: string): PageContent | undefined =>
  pageByPath.get(urlPath)

export const listAllPages = (): readonly PageContent[] =>
  Array.from(pageByPath.values())

export const validateAllPages = (): ValidationResult<PageContent> => {
  const { entries: validEntries, errors } = buildEntries()
  if (errors.length > 0) return { ok: false, errors }

  const items = validEntries.map((e) => ({
    filepath: stripLeadingSlash(e.jaFilepath),
    content: {
      slug: e.slug,
      urlPath: e.urlPath,
      sourcePath: {
        ja: stripLeadingSlash(e.jaFilepath),
        en: e.enFilepath ? stripLeadingSlash(e.enFilepath) : undefined,
      },
      frontmatter: { ja: e.ja.frontmatter, en: e.en?.frontmatter },
      html: { ja: "", en: undefined },
      toc: { ja: [], en: undefined },
    },
  }))

  return { ok: true, items }
}
