import rehypeAutolinkHeadings from "rehype-autolink-headings"
import rehypeExternalLinks from "rehype-external-links"
import rehypeHighlight from "rehype-highlight"
import rehypeSlug from "rehype-slug"
import rehypeStringify from "rehype-stringify"
import remarkGfm from "remark-gfm"
import remarkGithubBlockquoteAlert from "remark-github-blockquote-alert"
import remarkParse from "remark-parse"
import remarkRehype from "remark-rehype"
import { unified } from "unified"

const processor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkGithubBlockquoteAlert)
  .use(remarkRehype, { allowDangerousHtml: true })
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
  .use(rehypeStringify, { allowDangerousHtml: true })

export const markdownToHtml = (markdown: string): string =>
  String(processor.processSync(markdown))
