import { z } from "zod"

export const TocHeading = z.object({
  depth: z.union([z.literal(2), z.literal(3)]),
  text: z.string(),
  id: z.string(),
})

export type TocHeading = z.infer<typeof TocHeading>
