import type { FlowStep, Submission } from "~/schemas/submit"

import type { FlowContext } from "../context"
import { isNonEmptyScope } from "../shared"

export const bioprojectStep = (
  _submission: Submission,
  ctx: FlowContext,
): FlowStep[] => {
  const steps: FlowStep[] = []
  for (const assignment of ctx.primaryBioprojectAssignments) {
    const scope = {
      entryIds: [...assignment.entryIds],
      groupIds: [...assignment.groupIds],
    }
    if (!isNonEmptyScope(scope)) continue
    steps.push({
      id: assignment.bpId,
      service: "bioproject",
      scope,
      notes: [{ kind: "info", messageKey: "submit.bioproject.intro" }],
    })
  }
  return steps
}
