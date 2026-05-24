import { z } from "zod"

import { Service as SubmitService } from "~/schemas/submit"

const Bilingual = z.object({
  ja: z.string().min(1),
  en: z.string().min(1),
})

const ServiceLink = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("internal"), to: z.string().startsWith("/") }),
  z.object({ kind: z.literal("external"), href: z.string().url() }),
])

export type ServiceLink = z.infer<typeof ServiceLink>

const TopUsage = z.discriminatedUnion("category", [
  z.object({
    category: z.literal("primary-service"),
    order: z.number().int().nonnegative(),
  }),
  z.object({
    category: z.literal("popular-ddbj"),
    order: z.number().int().nonnegative(),
    monogram: z.string().regex(/^[A-Z][A-Z0-9]{1,2}$/),
  }),
  z.object({
    category: z.literal("popular-dbcls"),
    order: z.number().int().nonnegative(),
    monogram: z.string().regex(/^[A-Z][A-Z0-9]{1,2}$/),
  }),
])

export type ServiceTopCategory = z.infer<typeof TopUsage>["category"]

const SubmitUsage = z.object({
  service: SubmitService,
  externalUrl: z.string().url(),
  source: z.enum(["DDBJ", "DBCLS"]).nullable(),
  accessionPlaceholders: z.array(z.string()).default([]),
})

export const ServiceContent = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: Bilingual,
  description: Bilingual,
  link: ServiceLink.optional(),
  top: TopUsage.optional(),
  submit: SubmitUsage.optional(),
})
  .refine(
    (s) => s.top !== undefined || s.submit !== undefined,
    { message: "service must declare at least one of top or submit usage" },
  )
  .refine(
    (s) => s.top === undefined || s.link !== undefined,
    { message: "service with top usage must declare link" },
  )

export type ServiceContent = z.infer<typeof ServiceContent>
