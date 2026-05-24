import type { FileEntry, FlowStep, Submission } from "~/schemas/submit"

import type { FlowContext } from "../context"
import { entryHasChip } from "../context"
import { buildScope, isNonEmptyScope } from "../shared"

const isThirdParty = (e: FileEntry): boolean =>
  entryHasChip(e, "provenance", "third-party") || entryHasChip(e, "tpa-subtype")

export const thirdPartyStep = (
  submission: Submission,
  _ctx: FlowContext,
): FlowStep[] => {
  const entries = submission.fileEntries.filter(isThirdParty)
  const scope = buildScope(entries)
  if (!isNonEmptyScope(scope)) return []
  return [{
    id: "ddbj-mass:tpa",
    service: "ddbj-mass",
    scope,
    notes: [
      { kind: "info", messageKey: "submit.thirdParty.intro" },
      { kind: "warning", messageKey: "submit.thirdParty.originDoiRequired" },
    ],
  }]
}
