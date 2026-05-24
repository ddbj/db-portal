import type { FileEntry, FlowStep, Submission } from "~/schemas/submit"

import type { FlowContext } from "../context"
import { buildScope, buttonTypeIs, isNonEmptyScope, isRestrictedHuman } from "../shared"

const isJgaRow = (e: FileEntry): boolean =>
  buttonTypeIs(e, "sequence-read") && isRestrictedHuman(e)

export const jgaStep = (
  submission: Submission,
  _ctx: FlowContext,
): FlowStep[] => {
  const entries = submission.fileEntries.filter(isJgaRow)
  const scope = buildScope(entries)
  if (!isNonEmptyScope(scope)) return []
  return [{
    id: "jga",
    service: "jga",
    scope,
    notes: [
      { kind: "info", messageKey: "submit.jga.intro" },
      { kind: "info", messageKey: "submit.jga.dbclsApplicationRequired" },
    ],
  }]
}
