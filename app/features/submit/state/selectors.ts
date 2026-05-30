import type { FlowStep } from "~/schemas/submit"
import { isSubmissionEndpoint, TYPICAL_DATA_FORM_FOR_KIND, TYPICAL_GROUP_TYPE_FOR_KIND } from "~/schemas/submit"

import { isKindEnabled } from "../cascade"
import { deriveFlowSteps } from "../flow-rules"
import { hasRowDetail } from "../modals/form-defs"
import type { UIState, Validation } from "./types"

export const selectSteps = (state: UIState): FlowStep[] =>
  deriveFlowSteps(state.submission)

export const selectValidations = (state: UIState): Validation[] => {
  const { q1, q2 } = state.submission.preconditions
  const validations: Validation[] = []
  const groupIds = new Set(state.submission.fileGroups.map((g) => g.id))

  const steps = deriveFlowSteps(state.submission)
  // 登録エンドポイント = DDBJ 内 destination ∪ 外部の最終格納先 (jpost / eva)
  const destinationEntryIds = new Set<string>()
  for (const s of steps) {
    if (!isSubmissionEndpoint(s.service)) continue
    for (const id of s.scope.entryIds) destinationEntryIds.add(id)
  }

  for (const entry of state.submission.fileEntries) {
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
    // flow-changing 軸を持たない種別は設定するものがないため、設定済み (完了) として数える
    if (!hasRowDetail(e.fileTypeKind) || rowIsConfigured(state, e.id)) configured++
  }

  return { configured, total }
}
