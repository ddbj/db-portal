import { z } from "zod"

import {
  Access,
  ButtonType,
  ChipAxis,
  DataForm,
  isAllowedChipValue,
  Organism,
} from "./vocabulary"

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
  buttonType: ButtonType,
  filename: z.string().default(""),
  organism: Organism,
  access: Access,
  dataForm: DataForm,
  groupId: z.string().min(1),
  chipTags: z.array(FileEntryChip).default([]),
})
export type FileEntry = z.infer<typeof FileEntry>
