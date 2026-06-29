import { z } from "zod"

import { TocHeading } from "./toc-heading"

export const PageFrontmatter = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
})

export type PageFrontmatter = z.infer<typeof PageFrontmatter>

export const PageLastUpdated = z.object({
  ja: z.string().optional(),
  en: z.string().optional(),
})

export type PageLastUpdated = z.infer<typeof PageLastUpdated>

export const PageSourcePath = z.object({
  ja: z.string(),
  en: z.string().optional(),
})

export type PageSourcePath = z.infer<typeof PageSourcePath>

export const PageContent = z.object({
  slug: z.string(),
  urlPath: z.string(),
  sourcePath: PageSourcePath,
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
  lastUpdated: PageLastUpdated.optional(),
})

export type PageContent = z.infer<typeof PageContent>
