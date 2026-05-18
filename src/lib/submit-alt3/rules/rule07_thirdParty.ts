// Rule 7: TPA / Third-party 系の二系統
// SSOT: docs/submit-alt3-flow-rules.md §8.1 Rule 7a / 7b / 7c
//
// 7a: assembled + provenance=third-party → MSS Step (TPA prefix + KEYWORDS 自動付与)
// 7b: matrix / mass-spec + provenance=third-party → GEA/MetaboBank reanalysis (確認 dropdown)
// 7c: annotation + provenance=third-party → notes-only MSS Step (prefix 自動付与なし、curatorReviewRequired)

import {
  DDBJ_CONTACT_URL,
  METABOBANK_CONTACT_URL,
  MSS_TPA_DEFINITION_PREFIX,
  MSS_TPA_KEYWORDS_AUTO_APPEND,
  type MssTpaSubtype,
} from "@/lib/mock-data/submit-alt3"
import type {
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

export const generateRule7Steps = (
  submission: Submission,
  bpSplit: BpSplitContext,
  jga: JgaContext,
): FlowStep[] => {
  if (bpSplit.haplotypeMode) return []

  const steps: FlowStep[] = []

  for (const group of submission.fileGroups) {
    if (jga.jgaGroupIds.has(group.id)) continue
    const members = getGroupMembers(submission, group)
    if (members.length === 0) continue

    const rep = members[0]
    if (!rep) continue
    const provenance = fileChipValue(rep, "provenance")
    if (provenance !== "third-party") continue

    const buttonType = rep.buttonType

    if (buttonType === "assembled") {
      steps.push(makeTpaAssembledStep(submission, bpSplit, group, members))
    } else if (buttonType === "annotation") {
      steps.push(makeTpaAnnotationStep(submission, bpSplit, group, members))
    } else if (
      buttonType === "expression-array" ||
      buttonType === "expression-matrix" ||
      buttonType === "spatial-tx"
    ) {
      steps.push(makeGeaReanalysisStep(submission, bpSplit, group, members))
    } else if (buttonType === "mass-spec") {
      steps.push(
        makeMetabobankReanalysisStep(submission, bpSplit, group, members),
      )
    }
  }

  return steps
}

// 7a: TPA assembled (MSS prefix + KEYWORDS)
const makeTpaAssembledStep = (
  submission: Submission,
  bpSplit: BpSplitContext,
  group: FileGroup,
  members: ReturnType<typeof getGroupMembers>,
): FlowStep => {
  const bsId = getBsStepIdForGroup(submission, group.id)
  const discriminator = bsId
    ? bsId.replace("step-biosample-", "")
    : group.id
  const stepId = `step-mss-${discriminator}`

  const rep = members[0]
  const tpaSubtype = rep
    ? (fileChipValue(rep, "tpa-subtype") as MssTpaSubtype | undefined)
    : undefined
  const tpaPrefix = tpaSubtype ? MSS_TPA_DEFINITION_PREFIX[tpaSubtype] : undefined
  const tpaKeywords = tpaSubtype
    ? MSS_TPA_KEYWORDS_AUTO_APPEND[tpaSubtype]
    : undefined

  const upstream: string[] = []
  const bpStep = getBpStepIdForGroup(group.id, bpSplit)
  if (bpStep) upstream.push(bpStep)
  if (bsId) upstream.push(bsId)

  return createStep({
    service: "mss",
    discriminator,
    targetGroupIds: [group.id],
    targetFileIds: members.map((m) => m.id),
    intraDbInputs: mergeServiceDraft(submission, stepId, {
      thirdParty: true,
      tpaSubtype,
      definitionPrefix: tpaPrefix,
      keywords: tpaKeywords,
      citedAccessions: group.referenceMeta?.citedAccessions,
      pubmedId: group.referenceMeta?.pubmedId,
      doi: group.referenceMeta?.doi,
    }),
    upstreamStepIds: upstream,
    notes: [
      "routes.submitAlt3.flowGen.rule07a.tpaPrimaryRequired",
      "routes.submitAlt3.flowGen.rule07a.locusTagPrefix",
      DDBJ_CONTACT_URL,
    ],
  })
}

// 7c: TPA annotation (notes-only、curatorReviewRequired)
const makeTpaAnnotationStep = (
  submission: Submission,
  bpSplit: BpSplitContext,
  group: FileGroup,
  members: ReturnType<typeof getGroupMembers>,
): FlowStep => {
  const bsId = getBsStepIdForGroup(submission, group.id)
  const discriminator = bsId
    ? bsId.replace("step-biosample-", "")
    : group.id
  const stepId = `step-mss-${discriminator}`

  const upstream: string[] = []
  const bpStep = getBpStepIdForGroup(group.id, bpSplit)
  if (bpStep) upstream.push(bpStep)
  if (bsId) upstream.push(bsId)

  return createStep({
    service: "mss",
    discriminator,
    targetGroupIds: [group.id],
    targetFileIds: members.map((m) => m.id),
    intraDbInputs: mergeServiceDraft(submission, stepId, {
      thirdParty: true,
      annotationOnly: true,
      curatorReviewRequired: true,
      citedAccessions: group.referenceMeta?.citedAccessions,
      pubmedId: group.referenceMeta?.pubmedId,
      doi: group.referenceMeta?.doi,
    }),
    upstreamStepIds: upstream,
    notes: [
      "routes.submitAlt3.flowGen.rule07c.tpaAnnotationStopped",
      "routes.submitAlt3.flowGen.rule07c.curatorRequired",
      DDBJ_CONTACT_URL,
    ],
    warnings: [
      {
        id: `step-mss-${discriminator}:warning:curator-required`,
        severity: "warning",
        messageKey: "routes.submitAlt3.flowGen.rule07c.warning.curatorRequired",
      },
    ],
  })
}

// 7b: GEA reanalysis (confirmation dropdown)
const makeGeaReanalysisStep = (
  submission: Submission,
  bpSplit: BpSplitContext,
  group: FileGroup,
  members: ReturnType<typeof getGroupMembers>,
): FlowStep => {
  const bsId = getBsStepIdForGroup(submission, group.id)
  const discriminator = bsId
    ? bsId.replace("step-biosample-", "")
    : group.id
  const stepId = `step-gea-${discriminator}`

  const reviewStatus = group.referenceMeta?.reviewStatus ?? "unconfirmed"

  const upstream: string[] = []
  const bpStep = getBpStepIdForGroup(group.id, bpSplit)
  if (bpStep) upstream.push(bpStep)
  if (bsId) upstream.push(bsId)

  return createStep({
    service: "gea",
    discriminator,
    targetGroupIds: [group.id],
    targetFileIds: members.map((m) => m.id),
    intraDbInputs: mergeServiceDraft(submission, stepId, {
      thirdParty: true,
      reviewStatus,
      citedAccessions: group.referenceMeta?.citedAccessions,
      pubmedId: group.referenceMeta?.pubmedId,
      doi: group.referenceMeta?.doi,
      submitDisabled: reviewStatus !== "confirmed",
    }),
    upstreamStepIds: upstream,
    notes: [
      "routes.submitAlt3.flowGen.rule07b.teamReviewRequired",
      "routes.submitAlt3.flowGen.rule07b.peerReviewedRequired",
      DDBJ_CONTACT_URL,
    ],
    warnings:
      reviewStatus === "confirmed"
        ? []
        : [
          {
            id: `step-gea-${discriminator}:warning:reanalysis-unconfirmed`,
            severity: "warning",
            messageKey: "routes.submitAlt3.flowGen.rule07b.warning.unconfirmed",
          },
        ],
  })
}

// 7b: MetaboBank reanalysis (confirmation dropdown)
const makeMetabobankReanalysisStep = (
  submission: Submission,
  bpSplit: BpSplitContext,
  group: FileGroup,
  members: ReturnType<typeof getGroupMembers>,
): FlowStep => {
  const stepId = "step-metabobank"

  const reviewStatus = group.referenceMeta?.reviewStatus ?? "unconfirmed"

  const upstream: string[] = []
  const bpStep = getBpStepIdForGroup(group.id, bpSplit)
  if (bpStep) upstream.push(bpStep)
  const bsId = getBsStepIdForGroup(submission, group.id)
  if (bsId) upstream.push(bsId)

  return createStep({
    service: "metabobank",
    targetGroupIds: [group.id],
    targetFileIds: members.map((m) => m.id),
    intraDbInputs: mergeServiceDraft(submission, stepId, {
      thirdParty: true,
      reviewStatus,
      citedAccessions: group.referenceMeta?.citedAccessions,
      pubmedId: group.referenceMeta?.pubmedId,
      doi: group.referenceMeta?.doi,
      submitDisabled: reviewStatus !== "confirmed",
    }),
    upstreamStepIds: upstream,
    notes: [
      "routes.submitAlt3.flowGen.rule07b.teamReviewRequired",
      "routes.submitAlt3.flowGen.rule07b.peerReviewedRequired",
      METABOBANK_CONTACT_URL,
    ],
    warnings:
      reviewStatus === "confirmed"
        ? []
        : [
          {
            id: `${stepId}:warning:reanalysis-unconfirmed`,
            severity: "warning",
            messageKey: "routes.submitAlt3.flowGen.rule07b.warning.unconfirmed",
          },
        ],
  })
}
