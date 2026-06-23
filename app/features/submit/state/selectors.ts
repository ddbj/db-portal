import type { FlowStep } from "~/schemas/submit"
import { isSubmissionEndpoint, TYPICAL_GROUP_TYPE_FOR_KIND } from "~/schemas/submit"

import { isKindEnabled } from "../cascade"
import { optionMatches } from "../detail/form-apply"
import { getRowFormDef, hasRowDetail } from "../detail/form-defs"
import { deriveFlowSteps } from "../flow-rules"
import type { UIState, Validation } from "./types"

export const selectSteps = (state: UIState): FlowStep[] =>
  deriveFlowSteps(state.submission)

export const selectValidations = (state: UIState): Validation[] => {
  const { q2 } = state.submission.preconditions
  const validations: Validation[] = []
  const groupIds = new Set(state.submission.fileGroups.map((g) => g.id))

  const steps = deriveFlowSteps(state.submission)
  const destinationEntryIds = new Set<string>()
  for (const s of steps) {
    if (!isSubmissionEndpoint(s.service)) continue
    for (const id of s.scope.entryIds) destinationEntryIds.add(id)
  }

  for (const entry of state.submission.fileEntries) {
    if (!isKindEnabled(q2, entry.fileTypeKind)) {
      validations.push({ kind: "precondition-conflict", entryId: entry.id })
      continue
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

export const rowIsConfigured = (state: UIState, entryId: string): boolean => {
  const entry = state.submission.fileEntries.find((e) => e.id === entryId)
  if (!entry) return false
  const group = state.submission.fileGroups.find((g) => g.id === entry.groupId)
  const groupType = group?.groupType ?? TYPICAL_GROUP_TYPE_FOR_KIND[entry.fileTypeKind]
  const { q2 } = state.submission.preconditions

  const draft = { groupType, dataForm: entry.dataForm, chipTags: entry.chipTags }

  return getRowFormDef(entry.fileTypeKind, q2).groups.every(
    (g) => g.kind !== "radio" || g.options.some((opt) => optionMatches(opt, draft)),
  )
}

export const countConfiguredRows = (state: UIState): { configured: number; total: number } => {
  const { q2 } = state.submission.preconditions
  const total = state.submission.fileEntries.length
  let configured = 0
  for (const e of state.submission.fileEntries) {
    if (!hasRowDetail(e.fileTypeKind, q2) || rowIsConfigured(state, e.id)) configured++
  }

  return { configured, total }
}
