import type {
  ButtonType,
  DataForm,
  FileEntry,
  FileEntryChip,
  GroupType,
  Submission,
} from "~/schemas/submit"

export type RowEditPatch = {
  groupType?: GroupType
  dataForm?: DataForm
  chipTags?: FileEntryChip[]
}

export type Editing =
  | null
  | { kind: "row"; entryId: string }
  | { kind: "confirm-delete"; entryId: string }

export type UIState = {
  submission: Submission
  editing: Editing
}

export type ValidationKind =
  | "missing-organism"
  | "missing-filename"
  | "inconsistent-group-type"
  | "dangling-group-id"

export type Validation = {
  kind: ValidationKind
  entryId: string
}

export type Action =
  | { type: "ADD_ROW"; buttonType: ButtonType; entryId: string; groupId: string }
  | { type: "EDIT_ROW_CELL"; entryId: string; patch: Partial<FileEntry> }
  | { type: "OPEN_EDIT_ROW"; entryId: string }
  | { type: "COMMIT_ROW_EDIT"; entryId: string; patch: RowEditPatch }
  | {
    type: "ADD_TO_GROUP"
    groupId: string
    buttonType: ButtonType
    entryId: string
  }
  | { type: "OPEN_CONFIRM_DELETE"; entryId: string }
  | { type: "REMOVE_ROW"; entryId: string }
  | { type: "CLOSE_MODAL" }

export const createEmptyUIState = (): UIState => ({
  submission: { fileEntries: [], fileGroups: [], notes: "" },
  editing: null,
})
