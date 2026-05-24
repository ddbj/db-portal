import type { FileEntry, FileGroup, GroupType, Submission } from "~/schemas/submit"
import {
  TYPICAL_DATA_FORM_FOR_BUTTON,
  TYPICAL_GROUP_TYPE_FOR_BUTTON,
} from "~/schemas/submit"

import type { Action, RowEditPatch, UIState } from "./types"

const replaceEntry = (
  entries: readonly FileEntry[],
  entryId: string,
  patch: Partial<FileEntry>,
): FileEntry[] =>
  entries.map((e) => (e.id === entryId ? { ...e, ...patch, id: e.id, buttonType: e.buttonType } : e))

const replaceGroup = (
  groups: readonly FileGroup[],
  groupId: string,
  patch: Partial<FileGroup>,
): FileGroup[] =>
  groups.map((g) => (g.id === groupId ? { ...g, ...patch, id: g.id } : g))

const ensureGroupContainsEntry = (
  groups: readonly FileGroup[],
  groupId: string,
  entryId: string,
): FileGroup[] =>
  groups.map((g) =>
    g.id === groupId && !g.memberFileIds.includes(entryId)
      ? { ...g, memberFileIds: [...g.memberFileIds, entryId] }
      : g,
  )

const newGroupFor = (buttonType: FileEntry["buttonType"], groupId: string): FileGroup => ({
  id: groupId,
  groupType: TYPICAL_GROUP_TYPE_FOR_BUTTON[buttonType],
  memberFileIds: [],
  linkedGroupIds: [],
})

const newEntryFor = (
  buttonType: FileEntry["buttonType"],
  entryId: string,
  groupId: string,
): FileEntry => ({
  id: entryId,
  buttonType,
  filename: "",
  organism: "" as FileEntry["organism"],
  access: "open",
  dataForm: TYPICAL_DATA_FORM_FOR_BUTTON[buttonType],
  groupId,
  chipTags: [],
})

const dropEntryFromGroups = (
  groups: readonly FileGroup[],
  entryId: string,
): FileGroup[] =>
  groups
    .map((g) => ({
      ...g,
      memberFileIds: g.memberFileIds.filter((id) => id !== entryId),
    }))
    .filter((g) => g.memberFileIds.length > 0)

const applyRowEditPatch = (
  state: UIState,
  entryId: string,
  patch: RowEditPatch,
): UIState => {
  const entry = state.submission.fileEntries.find((e) => e.id === entryId)
  if (!entry) return state

  const entryPatch: Partial<FileEntry> = {}
  if (patch.dataForm !== undefined) entryPatch.dataForm = patch.dataForm
  if (patch.chipTags !== undefined) entryPatch.chipTags = patch.chipTags

  let groups = state.submission.fileGroups
  if (patch.groupType !== undefined) {
    groups = replaceGroup(groups, entry.groupId, { groupType: patch.groupType })
  }

  const entries = Object.keys(entryPatch).length > 0
    ? replaceEntry(state.submission.fileEntries, entryId, entryPatch)
    : state.submission.fileEntries

  return {
    submission: { ...state.submission, fileEntries: entries, fileGroups: groups },
    editing: null,
  }
}

const addRow = (
  state: UIState,
  buttonType: FileEntry["buttonType"],
  entryId: string,
  groupId: string,
): UIState => {
  const group = newGroupFor(buttonType, groupId)
  const entry = newEntryFor(buttonType, entryId, groupId)
  const groups = [
    ...state.submission.fileGroups,
    { ...group, memberFileIds: [entry.id] },
  ]
  const entries = [...state.submission.fileEntries, entry]
  return {
    submission: { ...state.submission, fileEntries: entries, fileGroups: groups },
    editing: { kind: "row", entryId: entry.id },
  }
}

const addToGroup = (
  state: UIState,
  groupId: string,
  buttonType: FileEntry["buttonType"],
  entryId: string,
): UIState => {
  const targetGroup = state.submission.fileGroups.find((g) => g.id === groupId)
  if (!targetGroup) return state

  const entry: FileEntry = newEntryFor(buttonType, entryId, groupId)
  return {
    submission: {
      ...state.submission,
      fileEntries: [...state.submission.fileEntries, entry],
      fileGroups: ensureGroupContainsEntry(state.submission.fileGroups, groupId, entry.id),
    },
    editing: { kind: "row", entryId: entry.id },
  }
}

const removeRow = (state: UIState, entryId: string): UIState => {
  const entries = state.submission.fileEntries.filter((e) => e.id !== entryId)
  const groups = dropEntryFromGroups(state.submission.fileGroups, entryId)
  return {
    submission: { ...state.submission, fileEntries: entries, fileGroups: groups },
    editing: null,
  }
}

export const submitReducer = (state: UIState, action: Action): UIState => {
  switch (action.type) {
    case "ADD_ROW":
      return addRow(state, action.buttonType, action.entryId, action.groupId)

    case "ADD_TO_GROUP":
      return addToGroup(state, action.groupId, action.buttonType, action.entryId)

    case "EDIT_ROW_CELL": {
      const patch: Partial<FileEntry> = { ...action.patch }
      delete patch.id
      delete patch.buttonType
      delete patch.groupId
      return {
        ...state,
        submission: {
          ...state.submission,
          fileEntries: replaceEntry(state.submission.fileEntries, action.entryId, patch),
        },
      }
    }

    case "OPEN_EDIT_ROW":
      return { ...state, editing: { kind: "row", entryId: action.entryId } }

    case "OPEN_CONFIRM_DELETE":
      return { ...state, editing: { kind: "confirm-delete", entryId: action.entryId } }

    case "COMMIT_ROW_EDIT":
      return applyRowEditPatch(state, action.entryId, action.patch)

    case "REMOVE_ROW":
      return removeRow(state, action.entryId)

    case "CLOSE_MODAL":
      return { ...state, editing: null }

  }
}

export const initialState: UIState = {
  submission: { fileEntries: [], fileGroups: [], notes: "" } satisfies Submission,
  editing: null,
}

export type { GroupType }
