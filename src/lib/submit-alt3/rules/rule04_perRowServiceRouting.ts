// Rule 4: 列 + ButtonType ごとの主要 Step 振り分け + Rule 4a-d 拡張
// SSOT: docs/submit-alt3-flow-rules.md §8.1 Rule 4 / 4a / 4b / 4c / 4d
//
// per-group で評価:
// - 通常 (single / pair-end / 10x / two-color / pacbio-hdf5 / hybrid / assembly-annotation /
//        variation-ref / imaging-ms / mage-tab / assembly-annotation) → 主要 Step 振り分け
// - mag-sag-chain → skip (rule08 が担当)
// - multiplex → skip (rule09 が担当)
// - JGA 集約対象 (jgaCtx) → skip (rule06 が担当)
//
// Haplotype phased ケース (Rule 11) は rule11 が DRA Run + MSS を生成するので、本 rule では除外。

import {
  DDBJ_CONTACT_URL,
  METABOBANK_CONTACT_URL,
  SPATIAL_PLATFORM_TO_GEA_SUBMISSION_TYPE,
  SPATIAL_TX_UNSUPPORTED_PLATFORMS,
} from "@/lib/mock-data/submit-alt3"
import {
  type GeaSubmissionType,
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

// ----- 内部 helper -----

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

const upstreamFor = (
  submission: Submission,
  bpSplit: BpSplitContext,
  groupId: string,
  includeBs: boolean,
): string[] => {
  const result: string[] = []
  const bp = getBpStepIdForGroup(groupId, bpSplit)
  if (bp) result.push(bp)
  if (includeBs) {
    const bs = getBsStepIdForGroup(submission, groupId)
    if (bs) result.push(bs)
  }

  return result
}

// ButtonType + dataForm + chip 値から「代表 file」を取り出して判定する
const representativeFile = (members: readonly FileEntry[]): FileEntry | undefined => {
  if (members.length === 0) return undefined

  // assembly-annotation Group は FASTA 側を優先
  const fasta = members.find((m) => m.role === "fasta-assembly")
  if (fasta) return fasta
  // variation-ref Group は VCF 側を優先
  const vcf = members.find((m) => m.role === "vcf")
  if (vcf) return vcf

  return members[0]
}

// ----- 主処理 -----

export const generateRule4Steps = (
  submission: Submission,
  bpSplit: BpSplitContext,
  jga: JgaContext,
): FlowStep[] => {
  // Haplotype phased はまるごと rule11 に任せる
  if (bpSplit.haplotypeMode) return []

  const steps: FlowStep[] = []

  for (const group of submission.fileGroups) {
    if (jga.jgaGroupIds.has(group.id)) continue
    if (group.groupType === "mag-sag-chain") continue
    if (group.groupType === "multiplex") continue

    const members = getGroupMembers(submission, group)
    if (members.length === 0) continue

    steps.push(...handleGroup(submission, bpSplit, group, members))
  }

  return steps
}

// 1 Group に対する判定。複数 Step を出す可能性あり (例: GEA Sequencing は DRA Run + GEA の 2 段、Rule 4a)
const handleGroup = (
  submission: Submission,
  bpSplit: BpSplitContext,
  group: FileGroup,
  members: readonly FileEntry[],
): FlowStep[] => {
  const rep = representativeFile(members)
  if (!rep) return []

  const buttonType = rep.buttonType
  const dataForm = rep.dataForm
  const organism = rep.organism
  const access = rep.accessRestriction
  const fg = fileChipValue(rep, "functional-genomics")
  const provenance = fileChipValue(rep, "provenance")
  const massSpecDomain = fileChipValue(rep, "mass-spec-domain")
  const variationForm = fileChipValue(rep, "variation-form")
  const variationType = fileChipValue(rep, "variation-type")
  const spatialPlatform = fileChipValue(rep, "spatial-platform")

  const result: FlowStep[] = []

  // 1. ButtonType=mass-spec 振り分け (jpost / metabobank)
  if (buttonType === "mass-spec") {
    if (massSpecDomain === "proteomics") {
      result.push(makeJpostStep(submission, group, members))
    } else {
      // metabolomics / imaging / undefined → MetaboBank (Rule 4c)
      result.push(
        makeMetabobankStep(submission, bpSplit, group, members),
      )
    }

    return result
  }

  // 2. ButtonType=variation 振り分け (dra / togovar / eva / dgva)
  if (buttonType === "variation") {
    result.push(
      ...handleVariation(
        submission,
        bpSplit,
        group,
        members,
        organism,
        access,
        variationForm,
        variationType,
      ),
    )

    return result
  }

  // 3. ButtonType=spatial-tx 振り分け (gea Sequencing / Microarray + DRA Run、Rule 4d)
  if (buttonType === "spatial-tx") {
    result.push(
      ...handleSpatialTx(
        submission,
        bpSplit,
        group,
        members,
        spatialPlatform,
      ),
    )

    return result
  }

  // 4. ButtonType=expression-array / expression-matrix + FG=yes → GEA (+ Rule 4a DRA Run)
  if (
    buttonType === "expression-array" ||
    buttonType === "expression-matrix"
  ) {
    result.push(
      ...handleExpression(
        submission,
        bpSplit,
        group,
        members,
        buttonType,
      ),
    )

    return result
  }

  // 5. ButtonType=assembled / annotation 振り分け (mss、Rule 7 系は rule07 が担当)
  if (buttonType === "assembled") {
    if (provenance === "third-party") {
      // Rule 7a/7c は rule07 で生成。本 rule では skip。
      return result
    }
    result.push(makeMssStep(submission, bpSplit, group, members))

    return result
  }

  if (buttonType === "annotation") {
    if (provenance === "third-party") {
      // Rule 7c は rule07 で生成
      return result
    }
    // 一次 annotation は assembly-annotation Group の FASTA 側 MSS Step に統合される
    // Group が assembly-annotation 以外なら独立 MSS Step を生成 (annotation only)
    if (group.groupType !== "assembly-annotation") {
      result.push(makeMssStep(submission, bpSplit, group, members))
    }

    return result
  }

  // 6. ButtonType=phenotype 振り分け (rule10 に任せる、ここではスキップ)
  if (buttonType === "phenotype") {
    return result
  }

  // 7. ButtonType=sequence-read 振り分け
  if (buttonType === "sequence-read") {
    result.push(
      ...handleSequenceRead(
        submission,
        bpSplit,
        group,
        members,
        dataForm,
        fg,
      ),
    )

    return result
  }

  return result
}

// ----- variation 振り分け (Rule 4 表) -----

const handleVariation = (
  submission: Submission,
  bpSplit: BpSplitContext,
  group: FileGroup,
  members: readonly FileEntry[],
  organism: string | undefined,
  access: string | undefined,
  variationForm: string | undefined,
  variationType: string | undefined,
): FlowStep[] => {
  const isHumanOpen = organism === "human" && access === "open"
  const isNonHuman =
    organism !== undefined &&
    organism !== "human" &&
    organism !== "human-microbiome"

  // aggregate + 人 + open → TogoVar (snp-indel → snp、sv/cnv → sv)
  if (
    variationForm === "aggregate" &&
    isHumanOpen
  ) {
    const studyType =
      variationType === "snp-indel" ? "snp" : "sv"

    return [makeTogoVarStep(submission, bpSplit, group, members, studyType)]
  }

  // 非ヒト + snp-indel → EVA
  if (isNonHuman && variationType === "snp-indel") {
    return [makeEvaStep(submission, group, members)]
  }
  // 非ヒト + sv/cnv → dgVa
  if (isNonHuman && (variationType === "sv" || variationType === "cnv")) {
    return [makeDgvaStep(submission, group, members)]
  }

  // per-sample + 非 JGA → DRA Analysis
  if (variationForm === "per-sample") {
    return [makeDraAnalysisStep(submission, bpSplit, group, members)]
  }

  // fallback: DRA Analysis
  return [makeDraAnalysisStep(submission, bpSplit, group, members)]
}

// ----- spatial-tx 振り分け (Rule 4d) -----

const handleSpatialTx = (
  submission: Submission,
  bpSplit: BpSplitContext,
  group: FileGroup,
  members: readonly FileEntry[],
  platform: string | undefined,
): FlowStep[] => {
  const platformValue = platform as keyof typeof SPATIAL_PLATFORM_TO_GEA_SUBMISSION_TYPE
  let submissionType: GeaSubmissionType | undefined =
    SPATIAL_PLATFORM_TO_GEA_SUBMISSION_TYPE[platformValue]

  // GeoMx は readout で振り分け
  if (platform === "geomx") {
    const readout = group.referenceMeta?.geomxReadout
    submissionType = readout === "ncounter" ? "Microarray" : "Sequencing"
  }

  const isUnsupported = SPATIAL_TX_UNSUPPORTED_PLATFORMS.includes(
    (platform ?? "other") as never,
  )

  const result: FlowStep[] = []

  // Sequencing なら Rule 4a で DRA Run 前段を追加
  if (submissionType === "Sequencing") {
    result.push(makeDraRunStep(submission, bpSplit, group, members))
  }

  const notes: string[] = []
  if (isUnsupported) {
    notes.push("routes.submitAlt3.flowGen.rule04d.unsupportedPlatform")
    notes.push(DDBJ_CONTACT_URL)
  }

  result.push(
    makeGeaStep(submission, bpSplit, group, members, submissionType, notes),
  )

  return result
}

// ----- expression-array / expression-matrix (Rule 4a: GEA + DRA Run) -----

const handleExpression = (
  submission: Submission,
  bpSplit: BpSplitContext,
  group: FileGroup,
  members: readonly FileEntry[],
  buttonType: "expression-array" | "expression-matrix",
): FlowStep[] => {
  const result: FlowStep[] = []

  // expression-array は Microarray、expression-matrix は raw=Sequencing / matrix=Microarray
  // PoC: expression-array → Microarray、expression-matrix → Sequencing (raw 由来想定)
  const submissionType: GeaSubmissionType =
    buttonType === "expression-array" ? "Microarray" : "Sequencing"

  // Rule 4a: Sequencing なら DRA Run 前段 (raw 行があるとき)
  const hasRaw = members.some((m) => m.dataForm === "raw")
  if (submissionType === "Sequencing" && hasRaw) {
    result.push(makeDraRunStep(submission, bpSplit, group, members))
  }

  result.push(
    makeGeaStep(submission, bpSplit, group, members, submissionType, []),
  )

  return result
}

// ----- sequence-read 振り分け (Rule 4 + 4b) -----

const handleSequenceRead = (
  submission: Submission,
  bpSplit: BpSplitContext,
  group: FileGroup,
  members: readonly FileEntry[],
  dataForm: string | undefined,
  fg: string | undefined,
): FlowStep[] => {
  const result: FlowStep[] = []

  if (dataForm === "raw") {
    if (fg === "yes") {
      // GEA Sequencing + DRA Run (Rule 4a)
      result.push(makeDraRunStep(submission, bpSplit, group, members))
      result.push(makeGeaStep(submission, bpSplit, group, members, "Sequencing", []))
    } else if (
      fg === "wgs-target" ||
      fg === "tsa-target" ||
      fg === "metagenome-target"
    ) {
      // DRA Run + 対応 MSS (Rule 4b) — raw だけのとき MSS は生成しない (Step 8 で MSS Group を別 file で持つ前提)
      result.push(makeDraRunStep(submission, bpSplit, group, members))
    } else {
      // variation-target / wes-target / other → DRA Run のみ
      result.push(makeDraRunStep(submission, bpSplit, group, members))
    }
  } else if (dataForm === "analysis-output") {
    result.push(makeDraAnalysisStep(submission, bpSplit, group, members))
  } else if (dataForm === "assembled") {
    // sequence-read で assembled は通常ないが、ユーザー操作で発生する可能性
    result.push(makeMssStep(submission, bpSplit, group, members))
  }

  return result
}

// ----- Step factory -----

const makeDraRunStep = (
  submission: Submission,
  bpSplit: BpSplitContext,
  group: FileGroup,
  members: readonly FileEntry[],
): FlowStep => {
  const bsStepId = getBsStepIdForGroup(submission, group.id)
  const discriminator = bsStepId
    ? bsStepId.replace("step-biosample-", "")
    : group.id
  const stepId = `step-dra-${discriminator}`

  return createStep({
    service: "dra",
    discriminator,
    targetGroupIds: [group.id],
    targetFileIds: members.map((m) => m.id),
    intraDbInputs: mergeServiceDraft(submission, stepId, {
      analysisKind: "Run",
    }),
    upstreamStepIds: upstreamFor(submission, bpSplit, group.id, true),
  })
}

const makeDraAnalysisStep = (
  submission: Submission,
  bpSplit: BpSplitContext,
  group: FileGroup,
  members: readonly FileEntry[],
): FlowStep => {
  const bsStepId = getBsStepIdForGroup(submission, group.id)
  const discriminator = bsStepId
    ? `${bsStepId.replace("step-biosample-", "")}-analysis`
    : `${group.id}-analysis`
  const stepId = `step-dra-${discriminator}`

  return createStep({
    service: "dra",
    discriminator,
    targetGroupIds: [group.id],
    targetFileIds: members.map((m) => m.id),
    intraDbInputs: mergeServiceDraft(submission, stepId, {
      analysisKind: "Analysis",
    }),
    upstreamStepIds: upstreamFor(submission, bpSplit, group.id, true),
  })
}

const makeMssStep = (
  submission: Submission,
  bpSplit: BpSplitContext,
  group: FileGroup,
  members: readonly FileEntry[],
): FlowStep => {
  const bsStepId = getBsStepIdForGroup(submission, group.id)
  const discriminator = bsStepId
    ? bsStepId.replace("step-biosample-", "")
    : group.id
  const stepId = `step-mss-${discriminator}`

  return createStep({
    service: "mss",
    discriminator,
    targetGroupIds: [group.id],
    targetFileIds: members.map((m) => m.id),
    intraDbInputs: mergeServiceDraft(submission, stepId, {}),
    upstreamStepIds: upstreamFor(submission, bpSplit, group.id, true),
  })
}

const makeGeaStep = (
  submission: Submission,
  bpSplit: BpSplitContext,
  group: FileGroup,
  members: readonly FileEntry[],
  submissionType: GeaSubmissionType | undefined,
  extraNotes: readonly string[],
): FlowStep => {
  const bsStepId = getBsStepIdForGroup(submission, group.id)
  const discriminator = bsStepId
    ? bsStepId.replace("step-biosample-", "")
    : group.id
  const stepId = `step-gea-${discriminator}`

  return createStep({
    service: "gea",
    discriminator,
    targetGroupIds: [group.id],
    targetFileIds: members.map((m) => m.id),
    intraDbInputs: mergeServiceDraft(submission, stepId, {
      submissionType,
    }),
    upstreamStepIds: upstreamFor(submission, bpSplit, group.id, true),
    notes: extraNotes,
  })
}

const makeMetabobankStep = (
  submission: Submission,
  bpSplit: BpSplitContext,
  group: FileGroup,
  members: readonly FileEntry[],
): FlowStep => {
  const stepId = "step-metabobank"

  return createStep({
    service: "metabobank",
    targetGroupIds: [group.id],
    targetFileIds: members.map((m) => m.id),
    intraDbInputs: mergeServiceDraft(submission, stepId, {
      submissionType: group.metaboBankSubmissionType,
    }),
    upstreamStepIds: upstreamFor(submission, bpSplit, group.id, true),
    notes: ["routes.submitAlt3.flowGen.rule04c.studyOnly"],
  })
}

const makeTogoVarStep = (
  submission: Submission,
  bpSplit: BpSplitContext,
  group: FileGroup,
  members: readonly FileEntry[],
  studyType: "snp" | "sv",
): FlowStep => {
  const stepId = "step-togovar"

  return createStep({
    service: "togovar",
    targetGroupIds: [group.id],
    targetFileIds: members.map((m) => m.id),
    intraDbInputs: mergeServiceDraft(submission, stepId, {
      studyType,
    }),
    upstreamStepIds: upstreamFor(submission, bpSplit, group.id, true),
  })
}

const makeJpostStep = (
  _submission: Submission,
  group: FileGroup,
  members: readonly FileEntry[],
): FlowStep =>
  createStep({
    service: "jpost",
    targetGroupIds: [group.id],
    targetFileIds: members.map((m) => m.id),
    intraDbInputs: {},
    upstreamStepIds: [],
    notes: [
      "routes.submitAlt3.flowGen.rule12.jpost.notes",
      METABOBANK_CONTACT_URL,
    ],
  })

const makeEvaStep = (
  _submission: Submission,
  group: FileGroup,
  members: readonly FileEntry[],
): FlowStep =>
  createStep({
    service: "eva",
    targetGroupIds: [group.id],
    targetFileIds: members.map((m) => m.id),
    intraDbInputs: {},
    upstreamStepIds: [],
    notes: ["routes.submitAlt3.flowGen.rule12.eva.notes"],
  })

const makeDgvaStep = (
  _submission: Submission,
  group: FileGroup,
  members: readonly FileEntry[],
): FlowStep =>
  createStep({
    service: "dgva",
    targetGroupIds: [group.id],
    targetFileIds: members.map((m) => m.id),
    intraDbInputs: {},
    upstreamStepIds: [],
    notes: ["routes.submitAlt3.flowGen.rule12.dgva.notes"],
  })
