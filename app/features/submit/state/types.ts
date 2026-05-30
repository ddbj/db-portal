import type {
  DataForm,
  FileEntry,
  FileEntryChip,
  FileTypeKind,
  GroupType,
  Q1,
  Q2,
  Submission,
} from "~/schemas/submit"

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
  | { type: "SET_Q1"; q1: Q1 | null }
  | { type: "SET_Q2"; q2: Q2 | null }
  | { type: "ADD_ROW"; fileTypeKind: FileTypeKind; entryId: string; groupId: string }
  | { type: "EDIT_ROW_CELL"; entryId: string; patch: Partial<FileEntry> }
  | { type: "COMMIT_ROW_EDIT"; entryId: string; patch: RowEditPatch; releasedGroupId: string }
  | {
    type: "SET_PAIR_PARTNER"
    annotationEntryId: string
    partnerEntryId: string
    releasedGroupId: string
  }
  | { type: "REMOVE_ROW"; entryId: string }

const emptySubmission = (): Submission => ({
  preconditions: { q1: null, q2: null },
  fileEntries: [],
  fileGroups: [],
  notes: "",
})

export const createEmptyUIState = (): UIState => ({
  submission: emptySubmission(),
})
