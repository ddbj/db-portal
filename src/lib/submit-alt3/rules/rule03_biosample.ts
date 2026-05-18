// Rule 3: BioSample Step + Rule 3a: Pathogen/Viral 病原性 Q&A
// SSOT: docs/submit-alt3-flow-rules.md §8.1 Rule 3 / 3a
//
// 各 BioSampleDraft に対して 1 Step を生成。Package は organism から推測 (Rule 3 default)。
// Rule 3a: Step 内 intraDbInputs.pathogenSelection を提供 (UI 側で Q&A 表示)。
//
// JGA 集約対象 (jgaCtx) の BS は本 rule では生成しない (Rule 6 側で JGA Sample Step に置き換え)。
// Haplotype phased ケース (Rule 11) は共通 BS 1 個を rule11 側で生成。
// MAG/SAG chain (Rule 8) の派生 BS も rule08 側で生成。

import { ORGANISM_DEFAULT_BS_PACKAGE } from "@/lib/mock-data/submit-alt3"
import type {
  FlowStep,
  Organism,
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

// Pathogen 4 Package + Viral default 切替 UX 用の Q&A 候補 (Rule 3a)
// virus / prokaryote / eukaryote 行に対して Step BS カードで補助 Q&A を表示する
const supportsPathogenQa = (organism: Organism | undefined): boolean =>
  organism === "virus" ||
  organism === "prokaryote" ||
  organism === "eukaryote"

// organism + 補助 Q&A 選択結果 → 最終 Package (Rule 3a)
// PoC では submission.serviceDrafts[bsStepId].pathogenSelection を読み取って判定
// (UI 未実装段階では default Package を使う)
const resolvePackage = (
  submission: Submission,
  stepId: string,
  organism: Organism | undefined,
): string | undefined => {
  if (organism === undefined) return undefined

  const defaultPackage = ORGANISM_DEFAULT_BS_PACKAGE[organism]
  const draft = submission.serviceDrafts[stepId]
  const pathogenSelection = draft?.pathogenSelection as string | undefined

  if (pathogenSelection === undefined || pathogenSelection === "no") {
    return defaultPackage
  }

  // 病原性 yes 時の細分
  if (organism === "virus") {
    const sub = draft?.virusSubtype as string | undefined
    if (sub === "sars-cov-2-cl") return "sars-cov-2-cl"
    if (sub === "sars-cov-2-wwsurv") return "sars-cov-2-wwsurv"

    return "pathogen-cl"
  }
  if (organism === "prokaryote") {
    const sub = draft?.pathogenSource as string | undefined

    return sub === "env" ? "pathogen-env" : "pathogen-cl"
  }
  if (organism === "eukaryote") {
    return "pathogen-cl"
  }

  return defaultPackage
}

export const generateRule3Steps = (
  submission: Submission,
  bpSplit: BpSplitContext,
  jga: JgaContext,
): FlowStep[] => {
  // Haplotype phased (Rule 11) は共通 BS Step を rule11 が直接 emit するため、本 rule は skip
  // (skip しないと bs-1 が rule03 + rule11 で 2 重に出て React の key 衝突を起こす、
  // flow-rules.md §8.1 Rule 11 + data-model §4.6.1)
  if (bpSplit.haplotypeMode) return []

  const steps: FlowStep[] = []

  // BpSplitContext から「どの assignment に属する BS か」を引くマップ
  const groupIdToBpId = new Map<string, string>()
  for (const a of bpSplit.assignments) {
    for (const g of a.groupIds) groupIdToBpId.set(g, a.bpId)
  }

  for (const bs of submission.biosamples) {
    const groupId = bs.sourceGroupIds[0]
    if (groupId === undefined) continue

    // JGA 集約対象は本 rule では出さない (Rule 6 で JGA Sample に置き換え)
    if (jga.jgaGroupIds.has(groupId)) continue

    const group = submission.fileGroups.find((g) => g.id === groupId)
    if (!group) continue
    const members = getGroupMembers(submission, group)
    const organism = members[0]?.organism

    const bpId = groupIdToBpId.get(groupId)
    const upstreamStepIds = bpId
      ? [`step-primary-bioproject-${bpId}`]
      : []

    const stepId = `step-biosample-${bs.id}`
    const packageHint = resolvePackage(submission, stepId, organism)

    const autoInputs: Record<string, unknown> = {
      package: packageHint,
      organismHint: organism,
      pathogenQaApplicable: supportsPathogenQa(organism),
    }

    steps.push(
      createStep({
        service: "biosample",
        discriminator: bs.id,
        targetGroupIds: bs.sourceGroupIds,
        targetFileIds: group.memberFileIds,
        intraDbInputs: mergeServiceDraft(submission, stepId, autoInputs),
        upstreamStepIds,
      }),
    )
  }

  return steps
}
