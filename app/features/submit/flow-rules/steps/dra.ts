import type { FileEntry, FlowStep, Submission } from "~/schemas/submit"

import type { FlowContext } from "../context"
import { buildScope, buttonTypeIs, isNonEmptyScope, isRestrictedHuman } from "../shared"

const isDraRow = (e: FileEntry): boolean =>
  buttonTypeIs(e, "sequence-read") && !isRestrictedHuman(e)

export const draStep = (
  submission: Submission,
  _ctx: FlowContext,
): FlowStep[] => {
  const entries = submission.fileEntries.filter(isDraRow)
  const scope = buildScope(entries)
  if (!isNonEmptyScope(scope)) return []
  return [{
    id: "dra",
    service: "dra",
    scope,
    notes: [{ kind: "info", messageKey: "submit.dra.intro" }],
  }]
}
