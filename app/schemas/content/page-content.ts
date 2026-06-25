import { z } from "zod"

import { TocHeading } from "./toc-heading"

export const PageFrontmatter = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
})

export type PageFrontmatter = z.infer<typeof PageFrontmatter>

export const PageContent = z.object({
  slug: z.string(),
  urlPath: z.string(),
  frontmatter: z.object({
    ja: PageFrontmatter,
    en: PageFrontmatter.optional(),
  }),
  html: z.object({
    ja: z.string(),
    en: z.string().optional(),
  }),
  toc: z.object({
    ja: z.array(TocHeading),
    en: z.array(TocHeading).optional(),
  }),
})

export type PageContent = z.infer<typeof PageContent>
