import {
  SitemapDoc,
  type SitemapDoc as TSitemapDoc,
  type SitemapItem,
} from "~/schemas/content/sitemap"

import sitemapJson from "../../../page-contents/sitemap.json"
import { getPageByPath, listAllPages } from "./markdown-loader"

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

const checkConsistency = (
  doc: TSitemapDoc,
  knownPaths: ReadonlySet<string>,
): SitemapValidationFailure[] => {
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
      if (!knownPaths.has(item.path)) {
        errors.push(fail(
          `"${item.path}" is referenced in sitemap.json but no matching page exists in page-contents/`,
        ))
      }
    }
  }

  for (const path of knownPaths) {
    if (!internalPaths.has(path)) {
      errors.push(fail(
        `"${path}" exists in page-contents/ but is not referenced in sitemap.json`,
      ))
    }
  }

  return errors
}

export const validateSitemapDoc = (
  raw: unknown,
  knownPaths: ReadonlySet<string>,
): SitemapValidationResult => {
  const parsed = SitemapDoc.safeParse(raw)
  if (!parsed.success) {
    const errors = parsed.error.issues.map((issue) =>
      fail(`${issue.path.join(".") || "<root>"}: ${issue.message}`),
    )

    return { ok: false, errors }
  }
  const consistency = checkConsistency(parsed.data, knownPaths)
  if (consistency.length > 0) return { ok: false, errors: consistency }

  return { ok: true, doc: parsed.data }
}

const collectKnownPaths = (): Set<string> => {
  const set = new Set<string>()
  for (const page of listAllPages()) {
    if (page.urlPath.startsWith("/_dev")) continue
    set.add(page.urlPath)
  }

  return set
}

export const validateSitemap = (): SitemapValidationResult =>
  validateSitemapDoc(sitemapJson, collectKnownPaths())

const renderItem = (item: SitemapItem): RenderedSitemapItem => {
  if (item.kind === "external") {
    return { kind: "external", url: item.url, label: { ...item.label } }
  }
  const page = getPageByPath(item.path)
  if (page === undefined) {
    throw new Error(`internal sitemap path "${item.path}" missing after validation`)
  }
  const ja = page.frontmatter.ja.title
  const en = page.frontmatter.en?.title

  return {
    kind: "internal",
    path: item.path,
    label: en !== undefined ? { ja, en } : { ja },
  }
}

const buildRendered = (doc: TSitemapDoc): RenderedSitemapSection[] =>
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

const cached: readonly RenderedSitemapSection[] = buildRendered(initial.doc)

export const getSitemap = (): readonly RenderedSitemapSection[] => cached
