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
  .use(remarkRehype)
  .use(rehypeStringify)

export const markdownToHtml = (markdown: string): string =>
  String(processor.processSync(markdown))
