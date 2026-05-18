// Rule 15: Hybrid Assembly Run group
// SSOT: docs/submit-alt3-flow-rules.md §8.1 Rule 15
//
// GroupType=hybrid のメタ Group は、子 Group (短鎖 / 長鎖) 各 1 ペアで「同 BS + 複数 Experiment + 複数 Run」を表現。
// rule04 が子 Group 毎に DRA Run Step を生成済み (Group 全体で 1 BS、access 一致前提)。
// 本 rule では:
//  - hybrid メタ Group を検出
//  - 子 Group 内 file の access 不一致を検出 → warning
//  - DRA Run Step に「Hybrid Assembly Group: 相手側 Experiment への参照」notes を後付け
//
// PoC: rule04 が出した DRA Run Step を変更するのではなく、追加の warning Step を出さない実装にする。
// 代わりに「hybrid Group の access 不一致」を返却 (orchestrator が globalWarnings として組み込む)。

import type {
  FileGroup,
  FlowStep,
  FlowWarning,
  Submission,
} from "@/types/submit-alt3"

import type { JgaContext } from "./context"
import { getGroupMembers } from "./shared"

export interface Rule15Result {
  // 既存 Step に追加する notes (Step ID → notes 配列)
  notesAddendum: Record<string, string[]>
  // hybrid メタ Group の access 不一致警告 (globalWarnings に追加)
  globalWarnings: FlowWarning[]
}

const isHybridMetaGroup = (group: FileGroup): boolean =>
  group.groupType === "hybrid"

export const evaluateRule15 = (
  submission: Submission,
  _jga: JgaContext,
): Rule15Result => {
  const notesAddendum: Record<string, string[]> = {}
  const globalWarnings: FlowWarning[] = []

  for (const meta of submission.fileGroups) {
    if (!isHybridMetaGroup(meta)) continue

    const childGroupIds = meta.memberGroupIds
    const childGroups = childGroupIds
      .map((id) => submission.fileGroups.find((g) => g.id === id))
      .filter((g): g is FileGroup => g !== undefined)

    // access 一致チェック
    const allMembers = childGroups.flatMap((g) => getGroupMembers(submission, g))
    const accessValues = new Set(
      allMembers.map((m) => m.accessRestriction).filter((v) => v !== undefined),
    )
    if (accessValues.size >= 2) {
      globalWarnings.push({
        id: `global:hybrid-access-mismatch:${meta.id}`,
        severity: "warning",
        messageKey: "routes.submitAlt3.flowGen.rule15.accessMismatch",
        messageParams: { groupId: meta.id },
      })
    }

    // 各子 Group の DRA Run Step に notes 追加
    for (let i = 0; i < childGroups.length; i++) {
      const child = childGroups[i]
      if (!child) continue
      const bs = submission.biosamples.find((b) =>
        b.sourceGroupIds.includes(child.id),
      )
      const discriminator = bs ? bs.id : child.id
      const stepId = `step-dra-${discriminator}`
      const otherChildIds = childGroups.filter((_, j) => j !== i).map((g) => g.id)

      const bucket = notesAddendum[stepId] ?? []
      bucket.push("routes.submitAlt3.flowGen.rule15.hybridMember")
      bucket.push(
        otherChildIds.join(", ") ||
        "routes.submitAlt3.flowGen.rule15.noPair",
      )
      notesAddendum[stepId] = bucket
    }
  }

  return { notesAddendum, globalWarnings }
}

// orchestrator が Step 配列に notes を適用する helper
export const applyRule15Notes = (
  steps: FlowStep[],
  result: Rule15Result,
): FlowStep[] =>
  steps.map((step) => {
    const addendum = result.notesAddendum[step.id]
    if (!addendum) return step

    return { ...step, notes: [...step.notes, ...addendum] }
  })
