import type { FileEntry, FlowStep, Submission } from "~/schemas/submit"

import type { FlowContext } from "../context"
import { buildScope, buttonTypeIs, isNonEmptyScope, isRestrictedHuman } from "../shared"

const isInternalVariation = (e: FileEntry): boolean =>
  buttonTypeIs(e, "variation") && !isRestrictedHuman(e)

const isExternalVariation = (e: FileEntry): boolean =>
  buttonTypeIs(e, "variation") && isRestrictedHuman(e)

export const variationStep = (
  submission: Submission,
  _ctx: FlowContext,
): FlowStep[] => {
  const steps: FlowStep[] = []

  const internal = submission.fileEntries.filter(isInternalVariation)
  const internalScope = buildScope(internal)
  if (isNonEmptyScope(internalScope)) {
    steps.push({
      id: "ddbj-mass:variation",
      service: "ddbj-mass",
      scope: internalScope,
      notes: [
        { kind: "info", messageKey: "submit.variation.internal.intro" },
        { kind: "info", messageKey: "submit.variation.internal.togovarLink" },
      ],
    })
  }

  const external = submission.fileEntries.filter(isExternalVariation)
  const externalScope = buildScope(external)
  if (isNonEmptyScope(externalScope)) {
    steps.push({
      id: "eva:variation",
      service: "eva",
      scope: externalScope,
      notes: [
        { kind: "warning", messageKey: "submit.variation.external.restrictedHuman" },
      ],
    })
  }

  return steps
}
