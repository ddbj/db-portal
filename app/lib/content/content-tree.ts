import type { PageContent } from "~/schemas/content/page-content"

import { listAllPages } from "./markdown-loader"

export type ContentTreeNode = {
  slug: string
  urlPath: string
  title: { ja: string; en?: string }
  description: { ja: string; en?: string }
}

export type ContentTreeSection = {
  section: string
  pages: ContentTreeNode[]
}

export type ContentTree = ContentTreeSection[]

const toNode = (page: PageContent): ContentTreeNode => ({
  slug: page.slug,
  urlPath: page.urlPath,
  title: {
    ja: page.frontmatter.ja.title,
    ...(page.frontmatter.en ? { en: page.frontmatter.en.title } : {}),
  },
  description: {
    ja: page.frontmatter.ja.description,
    ...(page.frontmatter.en ? { en: page.frontmatter.en.description } : {}),
  },
})

const extractSection = (urlPath: string): string =>
  urlPath.split("/").filter(Boolean)[0] ?? ""

const buildContentTree = (): ContentTree => {
  const sectionMap = new Map<string, ContentTreeNode[]>()

  for (const page of listAllPages()) {
    if (page.urlPath.startsWith("/_dev")) continue
    const section = extractSection(page.urlPath)
    const list = sectionMap.get(section) ?? []
    list.push(toNode(page))
    sectionMap.set(section, list)
  }

  const sections: ContentTree = []
  for (const [section, pages] of sectionMap) {
    pages.sort((a, b) => a.slug.localeCompare(b.slug))
    sections.push({ section, pages })
  }
  sections.sort((a, b) => a.section.localeCompare(b.section))

  return sections
}

let cached: ContentTree | undefined

export const getContentTree = (): ContentTree => {
  if (cached === undefined) cached = buildContentTree()

  return cached
}
