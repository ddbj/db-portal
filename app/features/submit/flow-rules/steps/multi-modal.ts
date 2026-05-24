import type { FileGroup, FlowStep, Submission } from "~/schemas/submit"

import type { FlowContext } from "../context"
import { entriesByGroup } from "../shared"

const isMultiModalGroup = (
  group: FileGroup,
  entries: readonly { buttonType: string }[],
): boolean => {
  if (group.groupType === "assembly-annotation") return false
  const distinct = new Set(entries.map((e) => e.buttonType))
  return distinct.size >= 2
}

export const multiModalStep = (
  submission: Submission,
  _ctx: FlowContext,
): FlowStep[] => {
  const byGroup = entriesByGroup(submission)
  const flaggedGroupIds: string[] = []
  const flaggedEntryIds: string[] = []
  for (const group of submission.fileGroups) {
    const entries = byGroup.get(group.id) ?? []
    if (isMultiModalGroup(group, entries)) {
      flaggedGroupIds.push(group.id)
      for (const e of entries) flaggedEntryIds.push(e.id)
    }
  }
  if (flaggedGroupIds.length === 0) return []
  return [{
    id: "ddbj-mass:multi-modal",
    service: "ddbj-mass",
    scope: {
      groupIds: [...new Set(flaggedGroupIds)].sort(),
      entryIds: [...new Set(flaggedEntryIds)].sort(),
    },
    notes: [
      { kind: "warning", messageKey: "submit.multiModal.warning" },
    ],
  }]
}
