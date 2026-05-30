import type { FileEntry, FlowStep, Submission } from "~/schemas/submit"

import { ENGINE_MESSAGE_KEYS as MK } from "../messages"
import { makeStep, scopeOfEntries, sortUnique } from "../shared"

// 制限公開ヒト個人データ・ヒト関連メタゲノムを Policy 単位の Dataset に束ねる。
// Dataset は jga-dataset group の明示を前提とし、束ねられない jga entry は単一の default Dataset に入れる。
export const jgaSubmissionSteps = (
  submission: Submission,
  jgaEntries: readonly FileEntry[],
): FlowStep[] => {
  if (jgaEntries.length === 0) return []

  const datasetGroups = submission.fileGroups.filter((g) => g.groupType === "jga-dataset")
  const steps: FlowStep[] = []
  const covered = new Set<string>()

  for (const dg of datasetGroups) {
    const dataGroupIds = new Set<string>([dg.id, ...dg.linkedGroupIds])
    const members = jgaEntries.filter((e) => dataGroupIds.has(e.groupId))
    if (members.length === 0) continue
    members.forEach((e) => covered.add(e.id))
    steps.push(
      makeStep(`recipe-jga-dataset-${dg.id}`, "jga", "recipe", {
        entryIds: sortUnique(members.map((e) => e.id)),
        groupIds: sortUnique([dg.id, ...members.map((e) => e.groupId)]),
      }, [{ kind: "info", messageKey: MK.jgaDatasetIntro }]),
    )
  }

  const remaining = jgaEntries.filter((e) => !covered.has(e.id))
  if (remaining.length > 0) {
    steps.push(
      makeStep("recipe-jga-dataset-default", "jga", "recipe", scopeOfEntries(remaining), [
        { kind: "info", messageKey: MK.jgaDatasetIntro },
      ]),
    )
  }

  // 提供申請 (NBDC ヒトデータベース / HumanDBs) と利用制限ポリシー (NBDC 標準 / 独自 JGAP) は
  // 同一プラットフォームで完結するため、1 つの Policy 前提ステップ (humandbs) に統合する。
  const allScope = scopeOfEntries(jgaEntries)
  steps.push(
    makeStep("recipe-jga-policy", "humandbs", "recipe", allScope, [
      { kind: "info", messageKey: MK.jgaPolicyApplication },
      { kind: "info", messageKey: MK.jgaNbdcPolicy },
    ]),
  )

  return steps
}
