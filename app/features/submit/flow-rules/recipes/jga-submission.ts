import type { FileEntry, FlowStep } from "~/schemas/submit"

import { ENGINE_MESSAGE_KEYS as MK } from "../messages"
import { makeStep, scopeOfEntries } from "../shared"

// Tier1 で JGA に routing された entry を 1 枚の JGA step に束ねる。 前提ゲート (humandbs) は
// humandbsPolicySteps が独立に emit する (指針対象なら destination に関係なく humandbs 申請が必要なため)。
export const jgaDatasetSteps = (jgaEntries: readonly FileEntry[]): FlowStep[] => {
  if (jgaEntries.length === 0) return []
  const scope = scopeOfEntries(jgaEntries)

  return [
    makeStep("recipe-jga", "jga", "recipe", scope, [
      { kind: "info", messageKey: MK.jgaDatasetIntro },
    ]),
  ]
}
