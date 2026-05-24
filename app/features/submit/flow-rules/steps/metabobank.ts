import type { FileEntry, FlowStep, FlowStepNote, Submission } from "~/schemas/submit"

import type { FlowContext } from "../context"
import { entryHasChip } from "../context"
import { buildScope, buttonTypeIs, groupTypeOf, isNonEmptyScope } from "../shared"

export const metabobankStep = (
  submission: Submission,
  _ctx: FlowContext,
): FlowStep[] => {
  const isMassSpecRow = (e: FileEntry): boolean => {
    if (buttonTypeIs(e, "mass-spec")) return true
    return groupTypeOf(submission, e.groupId) === "imaging-ms"
  }
  const entries = submission.fileEntries.filter(isMassSpecRow)
  const scope = buildScope(entries)
  if (!isNonEmptyScope(scope)) return []

  const notes: FlowStepNote[] = [{ kind: "info", messageKey: "submit.metabobank.intro" }]
  const hasProteomics = entries.some((e) => entryHasChip(e, "mass-spec-domain", "proteomics"))
  if (hasProteomics) {
    notes.push({ kind: "warning", messageKey: "submit.metabobank.jpostRedirect" })
  }

  return [{
    id: "metabobank",
    service: "metabobank",
    scope,
    notes,
  }]
}
