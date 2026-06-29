import { z } from "zod"

export const SitemapInternalItem = z.object({
  kind: z.literal("internal"),
  path: z.string().regex(/^\//, "must start with /"),
})

export const SitemapExternalItem = z.object({
  kind: z.literal("external"),
  url: z.string().url(),
  label: z.object({
    ja: z.string().min(1),
    en: z.string().min(1),
  }),
})

export const SitemapItem = z.discriminatedUnion("kind", [
  SitemapInternalItem,
  SitemapExternalItem,
])

export const SitemapSection = z.object({
  id: z.string().min(1),
  heading: z.object({
    ja: z.string().min(1),
    en: z.string().min(1),
  }),
  items: z.array(SitemapItem).min(1),
})

export const SitemapDoc = z.object({
  sections: z.array(SitemapSection).min(1),
})

export type SitemapInternalItem = z.infer<typeof SitemapInternalItem>
export type SitemapExternalItem = z.infer<typeof SitemapExternalItem>
export type SitemapItem = z.infer<typeof SitemapItem>
export type SitemapSection = z.infer<typeof SitemapSection>
export type SitemapDoc = z.infer<typeof SitemapDoc>
