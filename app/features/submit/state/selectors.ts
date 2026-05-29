import type { FileEntryChip, FlowStep } from "~/schemas/submit"
import { isDestinationService, TYPICAL_DATA_FORM_FOR_KIND, TYPICAL_GROUP_TYPE_FOR_KIND } from "~/schemas/submit"

import { isKindEnabled } from "../cascade"
import { deriveFlowSteps } from "../flow-rules"
import type { UIState, Validation } from "./types"

export const selectSteps = (state: UIState): FlowStep[] =>
  deriveFlowSteps(state.submission)

export const selectValidations = (state: UIState): Validation[] => {
  const { q1, q2 } = state.submission.preconditions
  const validations: Validation[] = []
  const groupIds = new Set(state.submission.fileGroups.map((g) => g.id))

  const steps = deriveFlowSteps(state.submission)
  const destinationEntryIds = new Set<string>()
  for (const s of steps) {
    if (!isDestinationService(s.service)) continue
    for (const id of s.scope.entryIds) destinationEntryIds.add(id)
  }

  for (const entry of state.submission.fileEntries) {
    if (entry.filename.trim() === "") {
      validations.push({ kind: "missing-filename", entryId: entry.id })
    }
    if (!isKindEnabled(q1, q2, entry.fileTypeKind)) {
      validations.push({ kind: "precondition-conflict", entryId: entry.id })
    }
    if (!destinationEntryIds.has(entry.id)) {
      validations.push({ kind: "no-destination-service", entryId: entry.id })
    }
    if (!groupIds.has(entry.groupId)) {
      validations.push({ kind: "dangling-group-id", entryId: entry.id })
    }
  }

  return validations
}

const formatChip = (chip: FileEntryChip): string => `${chip.axis}:${chip.value}`

export const selectRowDetailSummary = (state: UIState, entryId: string): string => {
  const entry = state.submission.fileEntries.find((e) => e.id === entryId)
  if (!entry) return ""
  const group = state.submission.fileGroups.find((g) => g.id === entry.groupId)
  const parts: string[] = []
  if (group !== undefined && group.groupType !== TYPICAL_GROUP_TYPE_FOR_KIND[entry.fileTypeKind]) {
    parts.push(group.groupType)
  }
  for (const chip of entry.chipTags.slice(0, 2)) {
    parts.push(formatChip(chip))
  }
  if (parts.length === 0 && entry.dataForm !== TYPICAL_DATA_FORM_FOR_KIND[entry.fileTypeKind]) {
    parts.push(entry.dataForm)
  }

  return parts.join(" / ")
}

export const rowIsConfigured = (state: UIState, entryId: string): boolean => {
  const entry = state.submission.fileEntries.find((e) => e.id === entryId)
  if (!entry) return false
  if (entry.chipTags.length > 0) return true
  if (entry.dataForm !== TYPICAL_DATA_FORM_FOR_KIND[entry.fileTypeKind]) return true
  const group = state.submission.fileGroups.find((g) => g.id === entry.groupId)
  if (group === undefined) return false

  return group.groupType !== TYPICAL_GROUP_TYPE_FOR_KIND[entry.fileTypeKind]
}

export const countConfiguredRows = (state: UIState): { configured: number; total: number } => {
  const total = state.submission.fileEntries.length
  let configured = 0
  for (const e of state.submission.fileEntries) {
    if (rowIsConfigured(state, e.id)) configured++
  }

  return { configured, total }
}
