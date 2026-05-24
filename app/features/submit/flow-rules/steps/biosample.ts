import type { FlowStep, Submission } from "~/schemas/submit"

import type { FlowContext } from "../context"
import { buildScope, isNonEmptyScope } from "../shared"

export const biosampleStep = (
  submission: Submission,
  ctx: FlowContext,
): FlowStep[] => {
  const steps: FlowStep[] = []
  for (const assignment of ctx.primaryBioprojectAssignments) {
    const entries = submission.fileEntries.filter((e) => e.organism === assignment.organism)
    const scope = buildScope(entries)
    if (!isNonEmptyScope(scope)) continue
    steps.push({
      id: `biosample:${assignment.organism}`,
      service: "biosample",
      scope,
      notes: [{ kind: "info", messageKey: "submit.biosample.intro" }],
    })
  }
  return steps
}
