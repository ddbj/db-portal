import { z } from "zod"

import { FileEntry } from "./file-entry"
import { FileGroup } from "./file-group"
import { Q2 } from "./vocabulary"

// 前段カスケードの選択。未選択は null
const Preconditions = z.object({
  q2: Q2.nullable().default(null),
})
type Preconditions = z.infer<typeof Preconditions>

// ② 公開区分。ヒト時のみ active。1 トグル + 1 radio + 3 トグルの状態。
// hasIdentifier は個人識別符号を含むかの radio (default = true、安全側)
const AccessSection = z.object({
  restrictedPreference: z.boolean().default(false),
  hasIdentifier: z.boolean().default(true),
  ethicsCompliance: z.boolean().default(true),
  publiclyAvailable: z.boolean().default(false),
  microbialAnalysis: z.boolean().default(false),
})
export type AccessSection = z.infer<typeof AccessSection>

export const Submission = z.object({
  preconditions: Preconditions.default({ q2: null }),
  accessSection: AccessSection.default({}),
  fileEntries: z.array(FileEntry).default([]),
  fileGroups: z.array(FileGroup).default([]),
  notes: z.string().default(""),
})
export type Submission = z.infer<typeof Submission>
