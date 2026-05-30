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

// assembly-annotation group の相方 (annotation 以外の member) を新しい単独 group へ戻す。相方が無ければ無変更
const detachPartner = (
  submission: Submission,
  annotationGroupId: string,
  annotationEntryId: string,
  releasedGroupId: string,
): Submission => {
  const partner = submission.fileEntries.find(
    (e) => e.groupId === annotationGroupId && e.id !== annotationEntryId,
  )
  if (partner === undefined) return submission

  const fileEntries = submission.fileEntries.map((e) =>
    e.id === partner.id ? { ...e, groupId: releasedGroupId } : e,
  )
  const fileGroups: FileGroup[] = [
    ...submission.fileGroups.map((g): FileGroup =>
      g.id === annotationGroupId
        ? { ...g, memberFileIds: g.memberFileIds.filter((id) => id !== partner.id) }
        : g,
    ),
    {
      id: releasedGroupId,
      groupType: TYPICAL_GROUP_TYPE_FOR_KIND[partner.fileTypeKind],
      memberFileIds: [partner.id],
      linkedGroupIds: [],
    },
  ]

  return { ...submission, fileEntries, fileGroups }
}

const applyRowEditPatch = (
  state: UIState,
  entryId: string,
  patch: RowEditPatch,
  releasedGroupId: string,
): UIState => {
  const entry = state.submission.fileEntries.find((e) => e.id === entryId)
  if (!entry) return state

  let submission = state.submission
  const group = submission.fileGroups.find((g) => g.id === entry.groupId)
  // アノテーションが assembly-annotation を離れるときはペアを解消し、相方 FASTA を単独 group へ戻す
  if (
    entry.fileTypeKind === "sequence-annotation"
    && group?.groupType === "assembly-annotation"
    && patch.groupType !== undefined
    && patch.groupType !== "assembly-annotation"
  ) {
    submission = detachPartner(submission, entry.groupId, entry.id, releasedGroupId)
  }

  const entryPatch: Partial<FileEntry> = {}
  if (patch.dataForm !== undefined) entryPatch.dataForm = patch.dataForm
  if (patch.chipTags !== undefined) entryPatch.chipTags = patch.chipTags

  const fileGroups = patch.groupType !== undefined
    ? replaceGroup(submission.fileGroups, entry.groupId, { groupType: patch.groupType })
    : submission.fileGroups
  const fileEntries = Object.keys(entryPatch).length > 0
    ? replaceEntry(submission.fileEntries, entryId, entryPatch)
    : submission.fileEntries

  return { submission: { ...submission, fileEntries, fileGroups } }
}

// アノテーション行の相方 FASTA を選ぶ。既存の相方は単独 group へ戻し、選んだ FASTA を
// annotation の group へ移して group を assembly-annotation にする
const setPairPartner = (
  state: UIState,
  annotationEntryId: string,
  partnerEntryId: string,
  releasedGroupId: string,
): UIState => {
  const annotation = state.submission.fileEntries.find((e) => e.id === annotationEntryId)
  const newPartner = state.submission.fileEntries.find((e) => e.id === partnerEntryId)
  if (annotation === undefined || newPartner === undefined) return state
  const annotationGroupId = annotation.groupId
  if (newPartner.groupId === annotationGroupId) return state

  const submission = detachPartner(state.submission, annotationGroupId, annotationEntryId, releasedGroupId)
  const oldPartnerGroupId = newPartner.groupId

  const fileEntries = submission.fileEntries.map((e) =>
    e.id === newPartner.id ? { ...e, groupId: annotationGroupId } : e,
  )
  const fileGroups = submission.fileGroups
    .map((g): FileGroup => {
      if (g.id === oldPartnerGroupId) {
        return { ...g, memberFileIds: g.memberFileIds.filter((id) => id !== newPartner.id) }
      }
      if (g.id === annotationGroupId) {
        return {
          ...g,
          groupType: "assembly-annotation",
          memberFileIds: [...g.memberFileIds.filter((id) => id !== newPartner.id), newPartner.id],
        }
      }
      return g
    })
    .filter((g) => g.memberFileIds.length > 0)

  return { submission: { ...submission, fileEntries, fileGroups } }
}

const setPreconditions = (state: UIState, patch: Partial<Submission["preconditions"]>): UIState => {
  const next = { ...state.submission.preconditions, ...patch }
  // Q1 変更で現在の Q2 が disable になったら Q2 を解除する (整合崩れを破壊的に解決しない)
  if (next.q2 !== null && !isQ2Enabled(next.q1, next.q2)) next.q2 = null

  return { submission: { ...state.submission, preconditions: next } }
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
  }
}

const removeRow = (state: UIState, entryId: string): UIState => {
  const entry = state.submission.fileEntries.find((e) => e.id === entryId)
  if (entry === undefined) return state
  const affectedGroupId = entry.groupId

  const fileEntries = state.submission.fileEntries.filter((e) => e.id !== entryId)
  const fileGroups = state.submission.fileGroups
    .map((g): FileGroup =>
      g.id === affectedGroupId
        ? { ...g, memberFileIds: g.memberFileIds.filter((id) => id !== entryId) }
        : g,
    )
    .filter((g) => g.memberFileIds.length > 0)
    // ペアの片方を消したら残った行を単独 group に戻す
    .map((g): FileGroup =>
      g.id === affectedGroupId && g.groupType === "assembly-annotation"
        ? { ...g, groupType: "single" }
        : g,
    )

  return { submission: { ...state.submission, fileEntries, fileGroups } }
}

export const submitReducer = (state: UIState, action: Action): UIState => {
  switch (action.type) {
    case "SET_Q1":
      return setPreconditions(state, { q1: action.q1 })

    case "SET_Q2":
      return setPreconditions(state, { q2: action.q2 })

    case "ADD_ROW":
      return addRow(state, action.fileTypeKind, action.entryId, action.groupId)

    case "EDIT_ROW_CELL": {
      const patch: Partial<FileEntry> = { ...action.patch }
      delete patch.id
      delete patch.fileTypeKind
      delete patch.groupId

      return {
        submission: {
          ...state.submission,
          fileEntries: replaceEntry(state.submission.fileEntries, action.entryId, patch),
        },
      }
    }

    case "COMMIT_ROW_EDIT":
      return applyRowEditPatch(state, action.entryId, action.patch, action.releasedGroupId)

    case "SET_PAIR_PARTNER":
      return setPairPartner(state, action.annotationEntryId, action.partnerEntryId, action.releasedGroupId)

    case "REMOVE_ROW":
      return removeRow(state, action.entryId)
  }
}

export const initialState: UIState = {
  submission: {
    preconditions: { q1: "public", q2: null },
    fileEntries: [],
    fileGroups: [],
    notes: "",
  } satisfies Submission,
}
