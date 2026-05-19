// Rule 9: multiplex Run (per-sample FASTQ + N BS)
// SSOT: docs/submit-alt3-flow-rules.md §8.1 Rule 9
//
// GroupType=multiplex の Group は、per-sample FASTQ ごとに 1 BS + 1 DRA Run を生成。
// reducer 側は既存 add-file で multiplex Group を作る (per-sample N members) が、
// BS は Group 単位 1 個しか生成していない (Phase A の recomputeBpAndBs)。
// PoC では rule09 が「論理的に per-sample BS / DRA Run を Step として表示」する設計。
// Step ID は file 単位で discriminator を持つ。
//
// 注意: BioSampleDraft state は Phase A reducer のまま (Group 単位 1 BS) なので、
// Step BioSample (Rule 3 が出す) と Step DRA Run (Rule 9 が出す) の対応関係は
// Rule 3 の BS Step が代表 BS、Rule 9 の DRA Run Step が per-sample N 個という形になる。
// Step BioSample カード内に「per-sample N 個」の list UI を持つ (本番で精緻化)。

import type {
  FlowStep,
  Submission,
} from "@/types/submit-alt3"

import type {
  BpSplitContext,
  JgaContext,
} from "./context"
import {
  createStep,
  getGroupMembers,
  mergeServiceDraft,
} from "./shared"

const getBpStepIdForGroup = (
  groupId: string,
  bpSplit: BpSplitContext,
): string | undefined => {
  for (const a of bpSplit.assignments) {
    if (a.groupIds.has(groupId)) return `step-primary-bioproject-${a.bpId}`
  }

  return undefined
}

const getBsStepIdForGroup = (
  submission: Submission,
  groupId: string,
): string | undefined => {
  const bs = submission.biosamples.find((b) =>
    b.sourceGroupIds.includes(groupId),
  )

  return bs ? `step-biosample-${bs.id}` : undefined
}

export const generateRule9Steps = (
  submission: Submission,
  bpSplit: BpSplitContext,
  jga: JgaContext,
): FlowStep[] => {
  if (bpSplit.haplotypeMode) return []

  const steps: FlowStep[] = []

  for (const group of submission.fileGroups) {
    if (group.groupType !== "multiplex") continue
    if (jga.jgaGroupIds.has(group.id)) continue

    const members = getGroupMembers(submission, group)
    if (members.length === 0) continue

    const bpId = getBpStepIdForGroup(group.id, bpSplit)
    const bsId = getBsStepIdForGroup(submission, group.id)
    const upstream: string[] = []
    if (bpId) upstream.push(bpId)
    if (bsId) upstream.push(bsId)

    // per-sample 各 file について 1 DRA Run Step (mergeKey で file 単位の維持を保証)
    for (const file of members) {
      const stepId = `step-dra-${file.id}`
      steps.push(
        createStep({
          service: "dra",
          discriminator: file.id,
          mergeKey: `dra:multiplex:${file.id}`,
          targetGroupIds: [group.id],
          targetFileIds: [file.id],
          intraDbInputs: mergeServiceDraft(submission, stepId, {
            analysisKind: "Run",
            multiplexMember: true,
          }),
          upstreamStepIds: upstream,
          notes: [
            "routes.submitAlt3.flowGen.rule09.barcodeProtocol",
          ],
        }),
      )
    }
  }

  return steps
}
