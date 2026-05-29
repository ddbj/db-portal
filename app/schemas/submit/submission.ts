import { z } from "zod"

import { FileEntry } from "./file-entry"
import { FileGroup } from "./file-group"
import { Q1, Q2 } from "./vocabulary"

// 前段カスケードの選択。未選択は null
export const Preconditions = z.object({
  q1: Q1.nullable().default(null),
  q2: Q2.nullable().default(null),
})
export type Preconditions = z.infer<typeof Preconditions>

export const Submission = z.object({
  preconditions: Preconditions.default({ q1: null, q2: null }),
  fileEntries: z.array(FileEntry).default([]),
  fileGroups: z.array(FileGroup).default([]),
  notes: z.string().default(""),
})
export type Submission = z.infer<typeof Submission>
