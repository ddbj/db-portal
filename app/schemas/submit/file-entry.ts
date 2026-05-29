import { z } from "zod"

import { Access, ChipAxis, DataForm, FileTypeKind, isAllowedChipValue } from "./vocabulary"

export const FileEntryChip = z
  .object({
    axis: ChipAxis,
    value: z.string().min(1),
  })
  .refine(({ axis, value }) => isAllowedChipValue(axis, value), {
    message: "chip value is not allowed for the given axis",
    path: ["value"],
  })
export type FileEntryChip = z.infer<typeof FileEntryChip>

export const FileEntry = z.object({
  id: z.string().min(1),
  fileTypeKind: FileTypeKind,
  filename: z.string().default(""),
  access: Access,
  dataForm: DataForm,
  groupId: z.string().min(1),
  chipTags: z.array(FileEntryChip).default([]),
})
export type FileEntry = z.infer<typeof FileEntry>
