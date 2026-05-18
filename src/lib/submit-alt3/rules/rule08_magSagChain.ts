// Rule 8: MAG / SAG derived chain
// SSOT: docs/submit-alt3-flow-rules.md §8.1 Rule 8a / 8b / 8c / 8d
//
// GroupType=mag-sag-chain の Group は段階別 Step を生成:
//   Step 4: DRA Run (raw reads)
//   Step 5: DRA Analysis (primary contigs)
//   Step 6: DRA Analysis (binned)
//   Step 7: MSS (MAG/SAG)
//
// raw 未提出時は Step 4 を notes-only にして rawStatus 3 択 UX を提供 (referenceMeta.rawStatus 参照)。
// 派生 BS は rule03 の BS Step とは別に「派生 BS Step」を追加 (Group の derivedFromBsIds 連鎖)。
// 8d (Section A 視覚化) は components/FileTable 側で対応。

import {
  DDBJ_CONTACT_URL,
} from "@/lib/mock-data/submit-alt3"
import type {
  FileEntry,
  FileGroup,
  FlowStep,
  Submission,
} from "@/types/submit-alt3"

import type {
  BpSplitContext,
  JgaContext,
} from "./context"
import {
  createStep,
  fileChipValue,
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

// MAG/SAG chain Group のメンバを段階別に分類
const classifyMembers = (members: readonly FileEntry[]): {
  raw: FileEntry[]
  primary: FileEntry[]
  binned: FileEntry[]
  mag: FileEntry[]
} => {
  const raw = members.filter(
    (m) =>
      m.dataForm === "raw" ||
      m.role === "r1" ||
      m.role === "r2" ||
      m.role === "single",
  )
  const primary = members.filter((m) => m.role === "primary-fasta")
  const binned = members.filter((m) => m.role === "binned-fasta")
  const mag = members.filter(
    (m) =>
      m.role === "mag-fasta" ||
      fileChipValue(m, "assembly-form") === "mag" ||
      fileChipValue(m, "assembly-form") === "sag",
  )

  return { raw, primary, binned, mag }
}

export const generateRule8Steps = (
  submission: Submission,
  bpSplit: BpSplitContext,
  jga: JgaContext,
): FlowStep[] => {
  if (bpSplit.haplotypeMode) return []

  const steps: FlowStep[] = []

  for (const group of submission.fileGroups) {
    if (group.groupType !== "mag-sag-chain") continue
    if (jga.jgaGroupIds.has(group.id)) continue

    const members = getGroupMembers(submission, group)
    if (members.length === 0) continue

    steps.push(...handleChain(submission, bpSplit, group, members))
  }

  return steps
}

const handleChain = (
  submission: Submission,
  bpSplit: BpSplitContext,
  group: FileGroup,
  members: readonly FileEntry[],
): FlowStep[] => {
  const { raw, primary, binned, mag } = classifyMembers(members)
  const bpStep = getBpStepIdForGroup(group.id, bpSplit)
  const bsStep = getBsStepIdForGroup(submission, group.id)

  const upstreamBpBs: string[] = []
  if (bpStep) upstreamBpBs.push(bpStep)
  if (bsStep) upstreamBpBs.push(bsStep)

  const result: FlowStep[] = []

  // Step 4: DRA Run (raw) — raw 未提出なら notes-only + rawStatus
  const rawStatus = group.referenceMeta?.rawStatus
  if (raw.length > 0) {
    const stepId = `step-dra-${group.id}-raw`
    result.push(
      createStep({
        service: "dra",
        discriminator: `${group.id}-raw`,
        targetGroupIds: [group.id],
        targetFileIds: raw.map((m) => m.id),
        intraDbInputs: mergeServiceDraft(submission, stepId, {
          analysisKind: "Run",
          magSagStage: "raw",
        }),
        upstreamStepIds: upstreamBpBs,
      }),
    )
  } else if (bpStep) {
    // raw 未提出 — notes-only Step
    const stepId = `step-dra-${group.id}-raw-external`
    const noteKeys: string[] = [
      "routes.submitAlt3.flowGen.rule08.rawExternalChoose",
    ]
    if (rawStatus === "external" && group.referenceMeta?.externalRawAccession) {
      noteKeys.push(`accession: ${group.referenceMeta.externalRawAccession}`)
    } else if (rawStatus === "external-db") {
      noteKeys.push("routes.submitAlt3.flowGen.rule08.externalDbConsult")
      noteKeys.push(DDBJ_CONTACT_URL)
    }

    result.push(
      createStep({
        service: "dra",
        discriminator: `${group.id}-raw-external`,
        targetGroupIds: [group.id],
        targetFileIds: [],
        intraDbInputs: mergeServiceDraft(submission, stepId, {
          analysisKind: "Run",
          magSagStage: "raw-external",
          rawStatus,
          externalRawAccession: group.referenceMeta?.externalRawAccession,
        }),
        upstreamStepIds: upstreamBpBs,
        notes: noteKeys,
        warnings:
          rawStatus === "pending" || rawStatus === undefined
            ? [
              {
                id: `step-dra-${group.id}-raw-external:warning:raw-pending`,
                severity: "warning",
                messageKey:
                  "routes.submitAlt3.flowGen.rule08.warning.rawPending",
              },
            ]
            : [],
      }),
    )
  }

  // Step 5: DRA Analysis (primary contigs)
  if (primary.length > 0) {
    const stepId = `step-dra-${group.id}-primary`
    result.push(
      createStep({
        service: "dra",
        discriminator: `${group.id}-primary`,
        targetGroupIds: [group.id],
        targetFileIds: primary.map((m) => m.id),
        intraDbInputs: mergeServiceDraft(submission, stepId, {
          analysisKind: "Analysis",
          analysisType: "De Novo Assembly",
          magSagStage: "primary",
        }),
        upstreamStepIds: upstreamBpBs,
        notes: ["routes.submitAlt3.flowGen.rule08.primaryContigsNote"],
      }),
    )
  }

  // 派生 BS Step (binned / mag を持つ場合に追加)
  const derivedBsDiscriminator = `${group.id}-derived`
  if (binned.length > 0 || mag.length > 0) {
    const bsStepId = `step-biosample-${derivedBsDiscriminator}`
    const derivedFrom = bsStep ? [bsStep.replace("step-biosample-", "")] : []
    result.push(
      createStep({
        service: "biosample",
        discriminator: derivedBsDiscriminator,
        targetGroupIds: [group.id],
        targetFileIds: [...binned, ...mag].map((m) => m.id),
        intraDbInputs: mergeServiceDraft(submission, bsStepId, {
          package: mag.length > 0 ? "mimag" : "misag",
          derivedFromBsIds: derivedFrom,
          derivedFromNote: "routes.submitAlt3.flowGen.rule08c.derivedFromNote",
        }),
        upstreamStepIds: bsStep ? [bsStep] : [],
        notes: ["routes.submitAlt3.flowGen.rule08.derivedBsNote"],
      }),
    )
  }

  const derivedBsStepId = (binned.length > 0 || mag.length > 0)
    ? `step-biosample-${derivedBsDiscriminator}`
    : bsStep

  // Step 6: DRA Analysis (binned contigs)
  if (binned.length > 0) {
    const stepId = `step-dra-${group.id}-binned`
    const upstream: string[] = []
    if (bpStep) upstream.push(bpStep)
    if (derivedBsStepId) upstream.push(derivedBsStepId)

    result.push(
      createStep({
        service: "dra",
        discriminator: `${group.id}-binned`,
        targetGroupIds: [group.id],
        targetFileIds: binned.map((m) => m.id),
        intraDbInputs: mergeServiceDraft(submission, stepId, {
          analysisKind: "Analysis",
          analysisType: "Sequence Annotation",
          magSagStage: "binned",
        }),
        upstreamStepIds: upstream,
      }),
    )
  }

  // Step 7: MSS (MAG/SAG)
  if (mag.length > 0) {
    const stepId = `step-mss-${derivedBsDiscriminator}`
    const upstream: string[] = []
    if (bpStep) upstream.push(bpStep)
    if (derivedBsStepId) upstream.push(derivedBsStepId)

    const rep = mag[0]
    const assemblyForm = rep ? fileChipValue(rep, "assembly-form") : undefined

    result.push(
      createStep({
        service: "mss",
        discriminator: derivedBsDiscriminator,
        targetGroupIds: [group.id],
        targetFileIds: mag.map((m) => m.id),
        intraDbInputs: mergeServiceDraft(submission, stepId, {
          dataType: assemblyForm?.toUpperCase(),
          division: "ENV",
          magSagStage: "mss",
        }),
        upstreamStepIds: upstream,
      }),
    )
  }

  return result
}
