import type { Access, FileEntry, FileGroup, Submission } from "~/schemas/submit"
import {
  DEFAULT_CHIPS_FOR_KIND,
  TYPICAL_DATA_FORM_FOR_KIND,
  TYPICAL_GROUP_TYPE_FOR_KIND,
} from "~/schemas/submit"
import type { AccessSection } from "~/schemas/submit/submission"

import { deriveAccess } from "../access"
import type { Action, RowEditPatch, UIState } from "./types"

const DEFAULT_ACCESS_SECTION: AccessSection = {
  restrictedPreference: false,
  hasIdentifier: false,
  ethicsCompliance: true,
  publiclyAvailable: false,
  microbialAnalysis: false,
}

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
  chipTags: [...(DEFAULT_CHIPS_FOR_KIND[fileTypeKind] ?? [])],
})

const applyRowEditPatch = (
  state: UIState,
  entryId: string,
  patch: RowEditPatch,
  _releasedGroupId: string,
): UIState => {
  const entry = state.submission.fileEntries.find((e) => e.id === entryId)
  if (!entry) return state

  const submission = state.submission

  const entryPatch: Partial<FileEntry> = {}
  if (patch.dataForm !== undefined) entryPatch.dataForm = patch.dataForm
  if (patch.chipTags !== undefined) {
    entryPatch.chipTags = patch.chipTags
    const { organismDomain } = submission.preconditions
    entryPatch.access = deriveAccess(organismDomain, submission.accessSection, entry.fileTypeKind, patch.chipTags)
  }

  const fileGroups = patch.groupType !== undefined
    ? replaceGroup(submission.fileGroups, entry.groupId, { groupType: patch.groupType })
    : submission.fileGroups
  const fileEntries = Object.keys(entryPatch).length > 0
    ? replaceEntry(submission.fileEntries, entryId, entryPatch)
    : submission.fileEntries

  return { submission: { ...submission, fileEntries, fileGroups } }
}

const applyExclusiveToggles = (
  current: AccessSection,
  patch: Partial<AccessSection>,
): AccessSection => {
  const next = { ...current, ...patch }

  if (patch.ethicsCompliance === true) {
    next.publiclyAvailable = false
    next.microbialAnalysis = false
  } else if (patch.publiclyAvailable === true || patch.microbialAnalysis === true) {
    next.ethicsCompliance = false
  }

  return next
}

const setAccessSection = (state: UIState, patch: Partial<AccessSection>): UIState => {
  const accessSection = applyExclusiveToggles(state.submission.accessSection, patch)
  const { organismDomain } = state.submission.preconditions
  const fileEntries = state.submission.fileEntries.map((e) => ({
    ...e,
    access: deriveAccess(organismDomain, accessSection, e.fileTypeKind, e.chipTags),
  }))

  return { submission: { ...state.submission, accessSection, fileEntries } }
}

const setOrganismDomain = (state: UIState, organismDomain: Submission["preconditions"]["organismDomain"]): UIState => {
  const preconditions = { ...state.submission.preconditions, organismDomain }
  const accessSection = DEFAULT_ACCESS_SECTION
  const fileEntries = state.submission.fileEntries.map((e) => ({
    ...e,
    access: deriveAccess(organismDomain, accessSection, e.fileTypeKind, e.chipTags),
  }))

  return { submission: { ...state.submission, preconditions, accessSection, fileEntries } }
}

const addRow = (
  state: UIState,
  fileTypeKind: FileEntry["fileTypeKind"],
  entryId: string,
  groupId: string,
): UIState => {
  const { organismDomain } = state.submission.preconditions
  const access = deriveAccess(organismDomain, state.submission.accessSection, fileTypeKind)

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

  return { submission: { ...state.submission, fileEntries, fileGroups } }
}

export const submitReducer = (state: UIState, action: Action): UIState => {
  switch (action.type) {
    case "SET_ORGANISM_DOMAIN":
      return setOrganismDomain(state, action.organismDomain)

    case "SET_ACCESS_SECTION":
      return setAccessSection(state, action.accessSection)

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
    preconditions: { organismDomain: null },
    accessSection: DEFAULT_ACCESS_SECTION,
    fileEntries: [],
    fileGroups: [],
    notes: "",
  } satisfies Submission,
}
