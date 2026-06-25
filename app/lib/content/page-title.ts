import type { MetaArgs, MetaDescriptor } from "react-router"

import { getPageBySlug } from "./markdown-loader"

const BRAND = "BSI"

type StaticTitleHandle = { titleSegments: readonly string[] }
type DynamicTitleHandle = { titleResolver: string }

export type TitleMatch = {
  handle?: unknown
  params: Readonly<Record<string, string | undefined>>
}

type TitleResolver = (match: TitleMatch) => readonly string[] | null

const isStaticTitleHandle = (h: unknown): h is StaticTitleHandle =>
  !!h && typeof h === "object"
  && Array.isArray((h as Partial<StaticTitleHandle>).titleSegments)

const isDynamicTitleHandle = (h: unknown): h is DynamicTitleHandle =>
  !!h && typeof h === "object"
  && typeof (h as Partial<DynamicTitleHandle>).titleResolver === "string"

// Reverse-breadcrumb document title. segments are in root-to-leaf order; the
// title reads leaf-first and always ends with the brand. No segments (top page)
// collapses to the brand alone. Titles are English-only and never localized.
export const buildTitle = (segments: readonly string[]): string =>
  segments.length === 0
    ? BRAND
    : [...segments].reverse().concat(BRAND).join(" | ")

const titleResolvers: Record<string, TitleResolver> = {
  "database-content": ({ params }) => {
    const slug = params.slug
    if (slug === undefined) return null
    const page = getPageBySlug("databases", slug)
    if (page === undefined) return null
    const title = page.frontmatter.en?.title ?? page.frontmatter.ja.title

    return ["Databases", title]
  },
}

// Walk the matched route chain leaf-first and build the title from the deepest
// route that declares one (static titleSegments or a dynamic titleResolver).
// Falls back to the brand for routes that declare neither (top page, callbacks).
export const resolvePageTitle = (matches: readonly TitleMatch[]): string => {
  for (const match of [...matches].reverse()) {
    const handle = match.handle
    if (isStaticTitleHandle(handle)) return buildTitle(handle.titleSegments)
    if (isDynamicTitleHandle(handle)) {
      const segments = titleResolvers[handle.titleResolver]?.(match)
      if (segments) return buildTitle(segments)
    }
  }

  return BRAND
}

const hasTitle = (tag: MetaDescriptor): boolean =>
  typeof tag === "object" && tag !== null && "title" in tag

// Shared route-level meta. A child route's meta replaces the root's, so the root
// meta tags (viewport / charset / icon / hreflang) are inherited from the root
// match and only the document title is swapped to this route's reverse-breadcrumb.
export const pageTitleMeta = ({ matches }: MetaArgs): MetaDescriptor[] => {
  const title = resolvePageTitle(matches)
  const inherited = matches.find((match) => match.id === "root")?.meta ?? []

  return inherited.map((tag) => (hasTitle(tag) ? { title } : tag))
}
