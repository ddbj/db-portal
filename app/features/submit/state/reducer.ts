import type { Access, FileEntry, FileGroup, Submission } from "~/schemas/submit"
import {
  TYPICAL_DATA_FORM_FOR_KIND,
  TYPICAL_GROUP_TYPE_FOR_KIND,
} from "~/schemas/submit"

import { defaultAccessFor } from "../access"
import { isQ2Enabled } from "../cascade"
import type { Action, RowEditPatch, UIState } from "./types"

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

const newEntryFor = (
  fileTypeKind: FileEntry["fileTypeKind"],
  entryId: string,
  groupId: string,
  access: Access,
): FileEntry => ({
  id: entryId,
  fileTypeKind,
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

  let next: Submission = { ...submission, fileEntries, fileGroups }
  // アノテーションが assembly-annotation に入るとき、単独 FASTA を自動でペアにする
  if (entry.fileTypeKind === "sequence-annotation" && patch.groupType === "assembly-annotation") {
    next = attachPartner(next, entry.groupId, entry.id)
  }

  return { submission: next }
}

// 単独 (single group) の FASTA を annotation の group に取り込み assembly-annotation にする。相方が無ければ無変更
const attachPartner = (
  submission: Submission,
  annotationGroupId: string,
  annotationEntryId: string,
): Submission => {
  const fasta = submission.fileEntries.find(
    (e) => e.fileTypeKind === "sequence-nucleotide"
      && e.id !== annotationEntryId
      && e.groupId !== annotationGroupId
      && submission.fileGroups.find((g) => g.id === e.groupId)?.groupType === "single",
  )
  if (fasta === undefined) return submission
  const oldGroupId = fasta.groupId

  const fileEntries = submission.fileEntries.map((e) =>
    e.id === fasta.id ? { ...e, groupId: annotationGroupId } : e,
  )
  const fileGroups = submission.fileGroups
    .map((g): FileGroup => {
      if (g.id === oldGroupId) {
        return { ...g, memberFileIds: g.memberFileIds.filter((id) => id !== fasta.id) }
      }
      if (g.id === annotationGroupId) {
        return {
          ...g,
          groupType: "assembly-annotation",
          memberFileIds: [...g.memberFileIds.filter((id) => id !== fasta.id), fasta.id],
        }
      }
      return g
    })
    .filter((g) => g.memberFileIds.length > 0)

  return { ...submission, fileEntries, fileGroups }
}

const setPreconditions = (state: UIState, patch: Partial<Submission["preconditions"]>): UIState => {
  const next = { ...state.submission.preconditions, ...patch }
  // Q1 変更で現在の Q2 が disable になったら Q2 を解除する (整合崩れを破壊的に解決しない)
  if (next.q2 !== null && !isQ2Enabled(next.q1, next.q2)) next.q2 = null
  // access は Q1/Q2 由来の default に追従する (公開 / 第三者 → 全 open、公開+制限 → Q2 で default)
  const fileEntries = state.submission.fileEntries.map((e) => ({
    ...e,
    access: defaultAccessFor(next.q1, next.q2, e.fileTypeKind),
  }))

  return { submission: { ...state.submission, preconditions: next, fileEntries } }
}

const addRow = (
  state: UIState,
  fileTypeKind: FileEntry["fileTypeKind"],
  entryId: string,
  groupId: string,
): UIState => {
  const { q1, q2 } = state.submission.preconditions
  const access = defaultAccessFor(q1, q2, fileTypeKind)

  // FASTA 追加時、相方 FASTA 待ちの assembly-annotation group があればそこへ取り込む
  if (fileTypeKind === "sequence-nucleotide") {
    const waiting = state.submission.fileGroups.find(
      (g) => g.groupType === "assembly-annotation"
        && !state.submission.fileEntries.some(
          (e) => e.groupId === g.id && e.fileTypeKind === "sequence-nucleotide",
        ),
    )
    if (waiting !== undefined) {
      const joined = newEntryFor(fileTypeKind, entryId, waiting.id, access)

      return {
        submission: {
          ...state.submission,
          fileEntries: [...state.submission.fileEntries, joined],
          fileGroups: state.submission.fileGroups.map((g) =>
            g.id === waiting.id ? { ...g, memberFileIds: [...g.memberFileIds, joined.id] } : g,
          ),
        },
      }
    }
  }

  const group = newGroupFor(fileTypeKind, groupId)
  const entry = newEntryFor(fileTypeKind, entryId, groupId, access)

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
