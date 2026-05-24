import type { FlowStep, Submission } from "~/schemas/submit"

import type { FlowContext } from "../context"
import { isNonEmptyScope } from "../shared"

export const umbrellaBioprojectStep = (
  _submission: Submission,
  ctx: FlowContext,
): FlowStep[] => {
  if (ctx.primaryBioprojectAssignments.length < 2) return []
  const entryIds = [...new Set(
    ctx.primaryBioprojectAssignments.flatMap((a) => a.entryIds),
  )].sort()
  const groupIds = [...new Set(
    ctx.primaryBioprojectAssignments.flatMap((a) => a.groupIds),
  )].sort()
  const scope = { entryIds, groupIds }
  if (!isNonEmptyScope(scope)) return []
  return [{
    id: "umbrella-bioproject",
    service: "umbrella-bioproject",
    scope,
    notes: [
      { kind: "info", messageKey: "submit.umbrella.intro" },
      { kind: "info", messageKey: "submit.umbrella.publicOnly" },
    ],
  }]
}
