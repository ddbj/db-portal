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
  access: Access,
  dataForm: DataForm,
  groupId: z.string().min(1),
  // At most one chip per axis: routing predicates match on `anyChip` by axis, so a
  // second chip on the same axis would make the outcome depend on array order.
  chipTags: z
    .array(FileEntryChip)
    .refine(
      (chips) => new Set(chips.map((c) => c.axis)).size === chips.length,
      { message: "chipTags must not contain more than one chip per axis" },
    )
    .default([]),
})
export type FileEntry = z.infer<typeof FileEntry>
