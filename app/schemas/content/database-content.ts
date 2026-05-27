import type { ReactNode } from "react"
import { z } from "zod"

const Bilingual = z.object({
  ja: z.string().min(1),
  en: z.string().min(1),
})

const BilingualBody = z.object({
  ja: z.custom<ReactNode>(),
  en: z.custom<ReactNode>(),
})

const ExternalLink = z.object({
  label: Bilingual,
  href: z.string().url(),
})

export const DatabaseSlug = z.enum(["bioproject", "biosample"])
export type DatabaseSlug = z.infer<typeof DatabaseSlug>

export const DatabaseContent = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: Bilingual,
  description: Bilingual,
  body: BilingualBody,
  meta: z.object({
    lastUpdated: z.string().datetime(),
    relatedDbs: z.array(DatabaseSlug).default([]),
    externalLinks: z.array(ExternalLink).default([]),
  }),
})

export type DatabaseContent = z.infer<typeof DatabaseContent>
