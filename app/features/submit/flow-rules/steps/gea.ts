import type { FileEntry, FlowStep, Submission } from "~/schemas/submit"

import type { FlowContext } from "../context"
import { buildScope, buttonTypeIs, groupTypeOf, isNonEmptyScope } from "../shared"

export const geaStep = (
  submission: Submission,
  _ctx: FlowContext,
): FlowStep[] => {
  const isGeaRow = (e: FileEntry): boolean => {
    if (buttonTypeIs(e, "microarray-expression", "rna-seq-matrix")) return true
    const gt = groupTypeOf(submission, e.groupId)
    return gt === "mage-tab" || gt === "two-color"
  }
  const entries = submission.fileEntries.filter(isGeaRow)
  const scope = buildScope(entries)
  if (!isNonEmptyScope(scope)) return []
  return [{
    id: "gea",
    service: "gea",
    scope,
    notes: [
      { kind: "info", messageKey: "submit.gea.intro" },
      { kind: "info", messageKey: "submit.gea.mageTabRequired" },
    ],
  }]
}
