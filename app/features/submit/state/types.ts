import type {
  DataForm,
  FileEntry,
  FileEntryChip,
  FileTypeKind,
  GroupType,
  Q2,
  Submission,
} from "~/schemas/submit"
import type { AccessSection } from "~/schemas/submit/submission"

export type RowEditPatch = {
  groupType?: GroupType
  dataForm?: DataForm
  chipTags?: FileEntryChip[]
}

export type UIState = {
  submission: Submission
}

export type ValidationKind =
  | "precondition-conflict"
  | "no-destination-service"
  | "dangling-group-id"

export type Validation = {
  kind: ValidationKind
  entryId: string
}

export type Action =
  | { type: "SET_Q2"; q2: Q2 | null }
  | { type: "SET_ACCESS_SECTION"; accessSection: Partial<AccessSection> }
  | { type: "ADD_ROW"; fileTypeKind: FileTypeKind; entryId: string; groupId: string }
  | { type: "EDIT_ROW_CELL"; entryId: string; patch: Partial<FileEntry> }
  | { type: "COMMIT_ROW_EDIT"; entryId: string; patch: RowEditPatch; releasedGroupId: string }
  | { type: "REMOVE_ROW"; entryId: string }
