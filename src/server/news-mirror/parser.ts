import matter from "gray-matter"
import type { Schema } from "hast-util-sanitize"
import rehypeSanitize, { defaultSchema } from "rehype-sanitize"
import rehypeStringify from "rehype-stringify"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { unified } from "unified"

import type { Lang } from "@/i18n"

import type { ParsedNewsItem } from "./types"

const sanitizeSchema: Schema = {
  ...defaultSchema,
  tagNames: [
    "a",
    "p",
    "ul",
    "ol",
    "li",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "code",
    "pre",
    "blockquote",
    "table",
    "thead",
    "tbody",
    "tr",
    "th",
    "td",
    "strong",
    "em",
    "br",
    "hr",
    "span",
    "img",
  ],
  attributes: {
    ...defaultSchema.attributes,
    a: [["href", /^https?:\/\//i, /^\//, /^#/], "title", "name"],
    img: [["src", /^https?:\/\//i, /^\//], "alt", "title"],
    span: ["className"],
  },
}

const processor = unified()
  .use(remarkParse)
  .use(remarkRehype, { allowDangerousHtml: true })
  .use(rehypeSanitize, sanitizeSchema)
  .use(rehypeStringify)

export const renderMarkdown = async (markdown: string): Promise<string> => {
  const file = await processor.process(markdown)

  return String(file)
}

const stripSlugSuffix = (basename: string, lang: Lang): string => {
  const noExt = basename.replace(/\.md$/i, "")
  if (lang === "en" && noExt.endsWith("-e")) return noExt.slice(0, -2)

  return noExt
}

export const parseNewsFile = (
  filePath: string,
  fileSha: string,
  raw: string,
  lang: Lang,
): ParsedNewsItem => {
  const parsed = matter(raw)
  const basename = filePath.split("/").pop() ?? filePath
  const slug = stripSlugSuffix(basename, lang)

  return {
    slug,
    lang,
    filePath,
    fileSha,
    data: parsed.data as ParsedNewsItem["data"],
    bodyMarkdown: parsed.content,
  }
}
