import { z } from "zod"

const SitemapInternalItem = z.object({
  kind: z.literal("internal"),
  path: z.string().regex(/^\//, "must start with /"),
  label: z.object({
    ja: z.string().min(1),
    en: z.string().min(1).optional(),
  }).optional(),
})

const SitemapExternalItem = z.object({
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

const SitemapSection = z.object({
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

export type SitemapItem = z.infer<typeof SitemapItem>
export type SitemapDoc = z.infer<typeof SitemapDoc>
