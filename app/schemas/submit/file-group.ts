import { z } from "zod"

import { GroupType } from "./vocabulary"

export const FileGroup = z.object({
  id: z.string().min(1),
  groupType: GroupType,
  memberFileIds: z.array(z.string().min(1)).default([]),
  linkedGroupIds: z.array(z.string().min(1)).default([]),
})
export type FileGroup = z.infer<typeof FileGroup>
