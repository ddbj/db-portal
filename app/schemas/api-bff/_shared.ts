import { z } from "zod"

export const langString = z.object({
  ja: z.string(),
  en: z.string(),
})

export const langOptionalUrl = z.object({
  ja: z.string().url().optional(),
  en: z.string().url().optional(),
})

export const BsiSource = z.enum(["ddbj", "dbcls"])
export type BsiSource = z.infer<typeof BsiSource>

export const cacheWrapper = <TItems extends z.ZodTypeAny, TVersion extends number>(
  items: TItems,
  schemaVersion: TVersion,
) =>
  z.object({
    schemaVersion: z.literal(schemaVersion),
    lastSyncSha: z.record(BsiSource, z.string().nullable()),
    lastFetchedAt: z.string().datetime({ offset: true }),
    items,
  })
