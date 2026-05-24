import { z } from "zod"

import { Access, ButtonType, ChipAxis, DataForm, Organism } from "./vocabulary"

export const FileEntryChip = z.object({
  axis: ChipAxis,
  value: z.string().min(1),
})
export type FileEntryChip = z.infer<typeof FileEntryChip>

export const FileEntry = z.object({
  id: z.string().min(1),
  buttonType: ButtonType,
  organism: Organism,
  access: Access,
  dataForm: DataForm,
  groupId: z.string().min(1),
  chipTags: z.array(FileEntryChip).default([]),
})
export type FileEntry = z.infer<typeof FileEntry>
