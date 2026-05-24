import type { FileEntry, FlowStep, Submission } from "~/schemas/submit"

import type { FlowContext } from "../context"
import { buildScope, buttonTypeIs, groupTypeOf, isNonEmptyScope } from "../shared"

export const annotationStep = (
  submission: Submission,
  _ctx: FlowContext,
): FlowStep[] => {
  const isAnnotationRow = (e: FileEntry): boolean => {
    if (buttonTypeIs(e, "gene-annotation")) return true
    return groupTypeOf(submission, e.groupId) === "assembly-annotation"
      && buttonTypeIs(e, "gene-annotation", "assembled")
  }
  const entries = submission.fileEntries.filter(isAnnotationRow)
  const scope = buildScope(entries)
  if (!isNonEmptyScope(scope)) return []
  return [{
    id: "annotation",
    service: "annotation",
    scope,
    notes: [{ kind: "info", messageKey: "submit.annotation.intro" }],
  }]
}
