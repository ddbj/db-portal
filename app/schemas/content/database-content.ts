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

const BilingualHref = z.object({
  ja: z.string().url(),
  en: z.string().url(),
})

const ExternalLink = z.object({
  label: Bilingual,
  href: z.union([z.string().url(), BilingualHref]),
})

const DatabaseSlug = z.enum([
  "bioproject",
  "biosample",
  "dra",
  "jga",
  "ddbj",
  "nsss",
  "togovar",
  "gea",
  "metabobank",
  "humandbs",
  "jpost",
  "eva",
])
type DatabaseSlug = z.infer<typeof DatabaseSlug>

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
