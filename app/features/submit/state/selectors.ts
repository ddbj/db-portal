import type { FileEntryChip, FlowStep } from "~/schemas/submit"
import { TYPICAL_DATA_FORM_FOR_BUTTON, TYPICAL_GROUP_TYPE_FOR_BUTTON } from "~/schemas/submit"

import { deriveFlowSteps } from "../flow-rules"
import type { UIState, Validation } from "./types"

export const selectSteps = (state: UIState): FlowStep[] =>
  deriveFlowSteps(state.submission)

export const selectValidations = (state: UIState): Validation[] => {
  const validations: Validation[] = []
  const groupIds = new Set(state.submission.fileGroups.map((g) => g.id))
  for (const entry of state.submission.fileEntries) {
    if (entry.filename.trim() === "") {
      validations.push({ kind: "missing-filename", entryId: entry.id })
    }
    if ((entry.organism as string).trim() === "") {
      validations.push({ kind: "missing-organism", entryId: entry.id })
    }
    if (!groupIds.has(entry.groupId)) {
      validations.push({ kind: "dangling-group-id", entryId: entry.id })
    }
  }
  for (const group of state.submission.fileGroups) {
    if (group.groupType === "mage-tab") {
      const members = state.submission.fileEntries.filter((e) => e.groupId === group.id)
      const hasIncompatible = members.some(
        (e) => e.buttonType !== "microarray-expression" && e.buttonType !== "rna-seq-matrix",
      )
      if (hasIncompatible) {
        for (const m of members) {
          validations.push({ kind: "inconsistent-group-type", entryId: m.id })
        }
      }
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
  if (group !== undefined && group.groupType !== TYPICAL_GROUP_TYPE_FOR_BUTTON[entry.buttonType]) {
    parts.push(group.groupType)
  }
  for (const chip of entry.chipTags.slice(0, 2)) {
    parts.push(formatChip(chip))
  }
  if (parts.length === 0 && entry.dataForm !== TYPICAL_DATA_FORM_FOR_BUTTON[entry.buttonType]) {
    parts.push(entry.dataForm)
  }
  return parts.join(" · ")
}

export const rowIsConfigured = (state: UIState, entryId: string): boolean => {
  const entry = state.submission.fileEntries.find((e) => e.id === entryId)
  if (!entry) return false
  if (entry.chipTags.length > 0) return true
  if (entry.dataForm !== TYPICAL_DATA_FORM_FOR_BUTTON[entry.buttonType]) return true
  const group = state.submission.fileGroups.find((g) => g.id === entry.groupId)
  if (group === undefined) return false
  return group.groupType !== TYPICAL_GROUP_TYPE_FOR_BUTTON[entry.buttonType]
}

export const countConfiguredRows = (state: UIState): { configured: number; total: number } => {
  const total = state.submission.fileEntries.length
  let configured = 0
  for (const e of state.submission.fileEntries) {
    if (rowIsConfigured(state, e.id)) configured++
  }
  return { configured, total }
}
