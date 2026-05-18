// Rule 2: Umbrella BioProject Step
// SSOT: docs/submit-alt3-flow-rules.md §8.1 Rule 2
//
// 発火条件: primary BP 数 >= 2 または haplotype-mode=phased
// 1 個固定 (`step-umbrella-bioproject`、discriminator なし)
// 各 primary BP の upstreamStepIds に本 Step id を追加 (rule01 / rule11 側で対応)

import type {
  FlowStep,
  Submission,
} from "@/types/submit-alt3"

import type { BpSplitContext } from "./context"
import {
  createStep,
  mergeServiceDraft,
} from "./shared"

export const generateRule2Step = (
  submission: Submission,
  bpSplit: BpSplitContext,
): FlowStep | undefined => {
  if (!bpSplit.umbrellaRequired) return undefined

  const stepId = "step-umbrella-bioproject"

  // 統括する primary BP の id 配列を notes / intraDbInputs に保存
  const childBpIds = bpSplit.assignments.map((a) => a.bpId)

  // childBpIds が空でも haplotypeMode=true なら Umbrella を出す
  // (rule11 が後で Principal/Alternate/DRA-shared BP を加える)

  const autoInputs: Record<string, unknown> = {
    childBpIds,
    haplotypeMode: bpSplit.haplotypeMode,
  }

  const targetGroupIds = new Set<string>()
  const targetFileIds = new Set<string>()
  for (const a of bpSplit.assignments) {
    for (const g of a.groupIds) targetGroupIds.add(g)
    for (const f of a.fileIds) targetFileIds.add(f)
  }

  return createStep({
    service: "umbrella-bioproject",
    targetGroupIds: Array.from(targetGroupIds),
    targetFileIds: Array.from(targetFileIds),
    intraDbInputs: mergeServiceDraft(submission, stepId, autoInputs),
    upstreamStepIds: [],
    notes: bpSplit.haplotypeMode
      ? ["routes.submitAlt3.flowGen.rule02.haplotypeNote"]
      : ["routes.submitAlt3.flowGen.rule02.mixedLineageNote"],
  })
}

export const UMBRELLA_STEP_ID = "step-umbrella-bioproject"
