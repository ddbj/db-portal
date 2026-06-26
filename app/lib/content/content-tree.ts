import { listAllPages } from "./markdown-loader"

export type NavNode = {
  slug: string
  urlPath: string
  label: { ja: string; en?: string }
  hasPage: boolean
  children: NavNode[]
}

export type NavTree = NavNode[]

type IntermediateNode = {
  slug: string
  label: { ja: string; en?: string } | null
  hasPage: boolean
  children: Map<string, IntermediateNode>
}

const capitalize = (s: string): string =>
  s.charAt(0).toUpperCase() + s.slice(1)

const createIntermediate = (slug: string): IntermediateNode => ({
  slug,
  label: null,
  hasPage: false,
  children: new Map(),
})

const buildNavTree = (): NavTree => {
  const root = new Map<string, IntermediateNode>()

  for (const page of listAllPages()) {
    if (page.urlPath.startsWith("/_dev")) continue

    const segments = page.urlPath.split("/").filter(Boolean)
    let level = root

    for (const [i, seg] of segments.entries()) {
      if (!level.has(seg)) level.set(seg, createIntermediate(seg))
      const node = level.get(seg)
      if (node === undefined) continue

      if (i === segments.length - 1) {
        node.hasPage = true
        node.label = {
          ja: page.frontmatter.ja.title,
          ...(page.frontmatter.en ? { en: page.frontmatter.en.title } : {}),
        }
      }

      level = node.children
    }
  }

  const toNavNodes = (map: Map<string, IntermediateNode>, pathPrefix: string): NavNode[] => {
    const nodes: NavNode[] = []
    for (const [, node] of map) {
      const urlPath = `${pathPrefix}/${node.slug}`
      nodes.push({
        slug: node.slug,
        urlPath,
        label: node.label ?? { ja: capitalize(node.slug), en: capitalize(node.slug) },
        hasPage: node.hasPage,
        children: toNavNodes(node.children, urlPath),
      })
    }
    nodes.sort((a, b) => a.slug.localeCompare(b.slug))

    return nodes
  }

  return toNavNodes(root, "")
}

export const findNavPath = (tree: NavTree, urlPath: string): NavNode[] => {
  for (const node of tree) {
    if (node.urlPath === urlPath) return [node]
    if (urlPath.startsWith(`${node.urlPath}/`)) {
      const deeper = findNavPath(node.children, urlPath)
      if (deeper.length > 0) return [node, ...deeper]
    }
  }

  return []
}

let cached: NavTree | undefined

export const getNavTree = (): NavTree => {
  if (cached === undefined) cached = buildNavTree()

  return cached
}

/** @deprecated Use getNavTree() instead */
export type ContentTreeNode = {
  slug: string
  urlPath: string
  title: { ja: string; en?: string }
  description: { ja: string; en?: string }
}

/** @deprecated Use NavTree instead */
export type ContentTreeSection = {
  section: string
  pages: ContentTreeNode[]
}

/** @deprecated Use NavTree instead */
export type ContentTree = ContentTreeSection[]

/** @deprecated Use getNavTree() instead */
export const getContentTree = (): ContentTree => {
  const tree = getNavTree()

  return tree.map((node) => ({
    section: node.slug,
    pages: node.children.map((child) => ({
      slug: child.slug,
      urlPath: child.urlPath,
      title: child.label,
      description: child.label,
    })),
  }))
}
