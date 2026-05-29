import type { Access, FileEntry, FileGroup, Q1, Submission } from "~/schemas/submit"
import {
  DEFAULT_FILENAME_FOR_KIND,
  TYPICAL_DATA_FORM_FOR_KIND,
  TYPICAL_GROUP_TYPE_FOR_KIND,
} from "~/schemas/submit"

import { isQ2Enabled } from "../cascade"
import type { Action, RowEditPatch, UIState } from "./types"

// Q1 が行レベル Access の default を注入する (公開 / 第三者解析は open、制限公開含むは restricted)
const accessDefaultForQ1 = (q1: Q1 | null): Access => (q1 === "restricted" ? "restricted" : "open")

const replaceEntry = (
  entries: readonly FileEntry[],
  entryId: string,
  patch: Partial<FileEntry>,
): FileEntry[] =>
  entries.map((e) => (e.id === entryId ? { ...e, ...patch, id: e.id, fileTypeKind: e.fileTypeKind } : e))

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

const newGroupFor = (fileTypeKind: FileEntry["fileTypeKind"], groupId: string): FileGroup => ({
  id: groupId,
  groupType: TYPICAL_GROUP_TYPE_FOR_KIND[fileTypeKind],
  memberFileIds: [],
  linkedGroupIds: [],
})

// 同 fileTypeKind の既存 filename から連番を読み取り max+1 を 3 桁ゼロ埋めした default 名を返す
// (削除後の再追加でも衝突しないよう max 方式)
export const defaultFilenameFor = (
  entries: readonly FileEntry[],
  fileTypeKind: FileEntry["fileTypeKind"],
): string => {
  const { prefix, ext } = DEFAULT_FILENAME_FOR_KIND[fileTypeKind]
  const re = new RegExp(`^${prefix}-(\\d+)`)
  let maxN = 0
  for (const entry of entries) {
    if (entry.fileTypeKind !== fileTypeKind) continue
    const match = entry.filename.match(re)
    if (match?.[1] !== undefined) {
      const n = Number.parseInt(match[1], 10)
      if (Number.isFinite(n) && n > maxN) maxN = n
    }
  }

  return `${prefix}-${String(maxN + 1).padStart(3, "0")}.${ext}`
}

const newEntryFor = (
  fileTypeKind: FileEntry["fileTypeKind"],
  entryId: string,
  groupId: string,
  filename: string,
  access: Access,
): FileEntry => ({
  id: entryId,
  fileTypeKind,
  filename,
  access,
  dataForm: TYPICAL_DATA_FORM_FOR_KIND[fileTypeKind],
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

const setPreconditions = (state: UIState, patch: Partial<Submission["preconditions"]>): UIState => {
  const next = { ...state.submission.preconditions, ...patch }
  // Q1 変更で現在の Q2 が disable になったら Q2 を解除する (整合崩れを破壊的に解決しない)
  if (next.q2 !== null && !isQ2Enabled(next.q1, next.q2)) next.q2 = null

  return { ...state, submission: { ...state.submission, preconditions: next } }
}

const addRow = (
  state: UIState,
  fileTypeKind: FileEntry["fileTypeKind"],
  entryId: string,
  groupId: string,
): UIState => {
  const group = newGroupFor(fileTypeKind, groupId)
  const filename = defaultFilenameFor(state.submission.fileEntries, fileTypeKind)
  const access = accessDefaultForQ1(state.submission.preconditions.q1)
  const entry = newEntryFor(fileTypeKind, entryId, groupId, filename, access)

  return {
    submission: {
      ...state.submission,
      fileEntries: [...state.submission.fileEntries, entry],
      fileGroups: [...state.submission.fileGroups, { ...group, memberFileIds: [entry.id] }],
    },
    editing: null,
  }
}

const addToGroup = (
  state: UIState,
  groupId: string,
  fileTypeKind: FileEntry["fileTypeKind"],
  entryId: string,
): UIState => {
  const targetGroup = state.submission.fileGroups.find((g) => g.id === groupId)
  if (!targetGroup) return state

  const filename = defaultFilenameFor(state.submission.fileEntries, fileTypeKind)
  const access = accessDefaultForQ1(state.submission.preconditions.q1)
  const entry = newEntryFor(fileTypeKind, entryId, groupId, filename, access)

  return {
    submission: {
      ...state.submission,
      fileEntries: [...state.submission.fileEntries, entry],
      fileGroups: ensureGroupContainsEntry(state.submission.fileGroups, groupId, entry.id),
    },
    editing: null,
  }
}

const removeRow = (state: UIState, entryId: string): UIState => ({
  submission: {
    ...state.submission,
    fileEntries: state.submission.fileEntries.filter((e) => e.id !== entryId),
    fileGroups: dropEntryFromGroups(state.submission.fileGroups, entryId),
  },
  editing: null,
})

export const submitReducer = (state: UIState, action: Action): UIState => {
  switch (action.type) {
    case "SET_Q1":
      return setPreconditions(state, { q1: action.q1 })

    case "SET_Q2":
      return setPreconditions(state, { q2: action.q2 })

    case "ADD_ROW":
      return addRow(state, action.fileTypeKind, action.entryId, action.groupId)

    case "ADD_TO_GROUP":
      return addToGroup(state, action.groupId, action.fileTypeKind, action.entryId)

    case "EDIT_ROW_CELL": {
      const patch: Partial<FileEntry> = { ...action.patch }
      delete patch.id
      delete patch.fileTypeKind
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
  submission: {
    preconditions: { q1: null, q2: null },
    fileEntries: [],
    fileGroups: [],
    notes: "",
  } satisfies Submission,
  editing: null,
}
