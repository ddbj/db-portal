import GithubSlugger from "github-slugger"
import remarkGfm from "remark-gfm"
import remarkParse from "remark-parse"
import { unified } from "unified"
import type { Node } from "unist"
import { visit } from "unist-util-visit"

import type { TocHeading } from "~/schemas/content/toc-heading"

type HeadingNode = Node & {
  depth: number
  children: (Node & { value?: string })[]
}

const headingText = (node: HeadingNode): string =>
  node.children
    .filter((c): c is Node & { value: string } => "value" in c && typeof c.value === "string")
    .map((c) => c.value)
    .join("")

export const extractHeadings = (markdown: string): TocHeading[] => {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown)
  const slugger = new GithubSlugger()
  const headings: TocHeading[] = []

  visit(tree, "heading", (node: HeadingNode) => {
    const depth = node.depth
    if (depth !== 2 && depth !== 3) return
    const text = headingText(node)
    if (text === "") return
    headings.push({ depth: depth as 2 | 3, text, id: slugger.slug(text) })
  })

  return headings
}
