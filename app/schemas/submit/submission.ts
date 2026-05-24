import { z } from "zod"

import { FileEntry } from "./file-entry"
import { FileGroup } from "./file-group"

export const Submission = z.object({
  fileEntries: z.array(FileEntry).default([]),
  fileGroups: z.array(FileGroup).default([]),
  notes: z.string().default(""),
})
export type Submission = z.infer<typeof Submission>
