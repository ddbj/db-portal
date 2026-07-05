import type { Root } from "hast"
import rehypeAutolinkHeadings from "rehype-autolink-headings"
import rehypeExternalLinks from "rehype-external-links"
import rehypeHighlight from "rehype-highlight"
import rehypeRaw from "rehype-raw"
import rehypeSlug from "rehype-slug"
import rehypeStringify from "rehype-stringify"
import remarkGfm from "remark-gfm"
import remarkGithubBlockquoteAlert from "remark-github-blockquote-alert"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { type Plugin, unified } from "unified"
import { visit } from "unist-util-visit"

const ASSET_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "svg", "webp", "avif", "pdf"] as const

type ResolveOptions = {
  sourceDir: string
  assetPaths: ReadonlySet<string>
  onUnresolved: (refPath: string) => void
}

const hasScheme = (src: string): boolean => /^[a-zA-Z][a-zA-Z0-9+\-.]*:/.test(src)

const extOf = (src: string): string | undefined => {
  const cleaned = src.split(/[?#]/)[0] ?? ""
  const lastDot = cleaned.lastIndexOf(".")
  if (lastDot < 0) return undefined

  return cleaned.slice(lastDot + 1).toLowerCase()
}

const shouldResolve = (src: string): boolean => {
  if (!src) return false
  if (hasScheme(src)) return false
  if (src.startsWith("/")) return false
  if (src.startsWith("#")) return false
  const ext = extOf(src)
  if (!ext) return false

  return (ASSET_EXTENSIONS as readonly string[]).includes(ext)
}

const resolveRelative = (src: string, sourceDir: string): string => {
  const base = new URL(`file://${sourceDir}/`)
  const target = new URL(src, base)

  return target.pathname
}

const rehypeResolveAssetPaths: Plugin<[ResolveOptions], Root> = (options) => {
  const { sourceDir, assetPaths, onUnresolved } = options

  return (tree) => {
    visit(tree, "element", (node) => {
      const attr =
        node.tagName === "img" ? "src"
          : node.tagName === "a" ? "href"
            : null
      if (!attr) return
      const value = node.properties?.[attr]
      if (typeof value !== "string") return
      if (!shouldResolve(value)) return
      const absolute = resolveRelative(value, sourceDir)
      if (!assetPaths.has(absolute)) {
        onUnresolved(value)

        return
      }
      node.properties[attr] = absolute
    })
  }
}

const buildProcessor = (options: ResolveOptions) =>
  unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkGithubBlockquoteAlert)
    .use(remarkRehype, { allowDangerousHtml: true })
    .use(rehypeRaw)
    .use(rehypeResolveAssetPaths, options)
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings, {
      behavior: "wrap",
      properties: { className: ["heading-anchor"] },
    })
    .use(rehypeExternalLinks, {
      target: "_blank",
      rel: ["noopener", "noreferrer"],
    })
    .use(rehypeHighlight, { detect: true })
    .use(rehypeStringify)

export const markdownToHtml = (markdown: string, options: ResolveOptions): string =>
  String(buildProcessor(options).processSync(markdown))
