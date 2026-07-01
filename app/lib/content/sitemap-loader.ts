import {
  SitemapDoc,
  type SitemapDoc as TSitemapDoc,
  type SitemapItem,
} from "~/schemas/content/sitemap"

import sitemapJson from "../../../page-contents/sitemap.json"
import { getPageByPath } from "./markdown-loader"

const SITEMAP_FILEPATH = "page-contents/sitemap.json"

export type RenderedSitemapItem =
  | { kind: "internal"; path: string; label: { ja: string; en?: string } }
  | { kind: "external"; url: string; label: { ja: string; en: string } }

export type RenderedSitemapSection = {
  id: string
  heading: { ja: string; en: string }
  items: RenderedSitemapItem[]
}

export type SitemapValidationFailure = {
  filepath: string
  message: string
}

export type SitemapValidationResult =
  | { ok: true; doc: TSitemapDoc }
  | { ok: false; errors: SitemapValidationFailure[] }

const fail = (message: string): SitemapValidationFailure => ({
  filepath: SITEMAP_FILEPATH,
  message,
})

const checkConsistency = (doc: TSitemapDoc): SitemapValidationFailure[] => {
  const errors: SitemapValidationFailure[] = []
  const sectionIds = new Set<string>()
  const internalPaths = new Set<string>()

  for (const section of doc.sections) {
    if (sectionIds.has(section.id)) {
      errors.push(fail(`duplicate section id "${section.id}"`))
    } else {
      sectionIds.add(section.id)
    }
    for (const item of section.items) {
      if (item.kind !== "internal") continue
      if (internalPaths.has(item.path)) {
        errors.push(fail(
          `duplicate internal path "${item.path}" (appears in multiple sections)`,
        ))
      } else {
        internalPaths.add(item.path)
      }
    }
  }

  return errors
}

export const validateSitemapDoc = (raw: unknown): SitemapValidationResult => {
  const parsed = SitemapDoc.safeParse(raw)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) =>
      fail(`${issue.path.join(".") || "<root>"}: ${issue.message}`),
    )

    return { ok: false, errors }
  }
  const consistency = checkConsistency(parsed.data)
  if (consistency.length > 0) return { ok: false, errors: consistency }

  return { ok: true, doc: parsed.data }
}

export const validateSitemap = (): SitemapValidationResult =>
  validateSitemapDoc(sitemapJson)

const renderItem = (item: SitemapItem): RenderedSitemapItem => {
  if (item.kind === "external") {
    return { kind: "external", url: item.url, label: { ...item.label } }
  }
  if (item.label !== undefined) {
    const { ja, en } = item.label

    return {
      kind: "internal",
      path: item.path,
      label: en !== undefined ? { ja, en } : { ja },
    }
  }
  const page = getPageByPath(item.path)
  if (page === undefined) {
    throw new Error(
      `sitemap internal path "${item.path}" has no label and no matching page — add label to sitemap.json or create page-contents${item.path}/index.md`,
    )
  }
  const ja = page.frontmatter.ja.title
  const en = page.frontmatter.en?.title

  return {
    kind: "internal",
    path: item.path,
    label: en !== undefined ? { ja, en } : { ja },
  }
}

export const renderSitemap = (doc: TSitemapDoc): RenderedSitemapSection[] =>
  doc.sections.map((section) => ({
    id: section.id,
    heading: { ...section.heading },
    items: section.items.map(renderItem),
  }))

const initial = validateSitemap()
if (!initial.ok) {
  const lines = initial.errors.map((e) => `  ${e.message}`)
  throw new Error(
    `Sitemap validation failed (${SITEMAP_FILEPATH}):\n${lines.join("\n")}`,
  )
}

const cached: readonly RenderedSitemapSection[] = renderSitemap(initial.doc)

export const getSitemap = (): readonly RenderedSitemapSection[] => cached
