import { z } from "zod"

import { Access, ChipAxis, DataForm, FileTypeKind, isAllowedChipValue, isMultiValueChipAxis } from "./vocabulary"

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
  // At most one chip per single-value axis, and never the same chip twice: routing
  // predicates match on `anyChip` by axis and value, so a duplicate would make the
  // outcome depend on array order.
  chipTags: z
    .array(FileEntryChip)
    .refine(
      (chips) => {
        const keys = chips.map((c) => (isMultiValueChipAxis(c.axis) ? `${c.axis}=${c.value}` : c.axis))

        return new Set(keys).size === keys.length
      },
      { message: "chipTags must not repeat a chip or hold more than one chip on a single-value axis" },
    )
    .default([]),
})
export type FileEntry = z.infer<typeof FileEntry>
