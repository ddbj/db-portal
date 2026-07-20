import type { FileEntry, FlowStep, OrganismDomain } from "~/schemas/submit"
import type { AccessSection } from "~/schemas/submit/submission"

import { requiresHumandbsApplication } from "../../access"
import { ENGINE_MESSAGE_KEYS as MK } from "../messages"
import { makeStep, scopeOfEntries } from "../shared"

// ヒト × 指針対象の submission に対して、 destination に関係なく humandbs 提供申請 step を 1 枚 emit する。
// JGA フローでも同じ step を emit し、 mergeSameServiceSteps が scope を union して 1 枚に集約する。
export const humandbsPolicySteps = (
  activeEntries: readonly FileEntry[],
  organismDomain: OrganismDomain | null,
  accessSection: AccessSection,
): FlowStep[] => {
  if (!requiresHumandbsApplication(organismDomain, accessSection)) return []
  if (activeEntries.length === 0) return []

  return [
    makeStep("recipe-humandbs-policy", "humandbs", "recipe", scopeOfEntries(activeEntries), [
      { kind: "info", messageKey: MK.jgaPolicyApplication },
      { kind: "info", messageKey: MK.jgaNbdcPolicy },
    ]),
  ]
}
