import type { FileEntry, FlowStep } from "~/schemas/submit"

import { ENGINE_MESSAGE_KEYS as MK } from "../messages"
import { makeStep, scopeOfEntries } from "../shared"

// 制限公開ヒト個人データを JGA に出すための前提ゲート (humandbs) と JGA 登録 step を足す。
// JGA は BioProject/BioSample を使わないため、derive-flow-steps が jga entry を companion 対象から
// 外すことで既定 companion を抑制する。
export const jgaSubmissionSteps = (jgaEntries: readonly FileEntry[]): FlowStep[] => {
  if (jgaEntries.length === 0) return []
  const scope = scopeOfEntries(jgaEntries)

  return [
    makeStep("recipe-jga-policy", "humandbs", "recipe", scope, [
      { kind: "info", messageKey: MK.jgaPolicyApplication },
      { kind: "info", messageKey: MK.jgaNbdcPolicy },
    ]),
    makeStep("recipe-jga", "jga", "recipe", scope, [
      { kind: "info", messageKey: MK.jgaDatasetIntro },
    ]),
  ]
}
