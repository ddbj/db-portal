// Rule 11: Haplotype phased (Principal / Alternate / DRA 用 + Umbrella)
// SSOT: docs/submit-alt3-flow-rules.md §8.1 Rule 11a / 11b / 11c / 11d
//
// chip haplotype-mode=phased が 1 行でも存在する場合に発火 (rule01 / rule04 はスキップ)。
// 構造:
//   Step 0: Umbrella BioProject (rule02 が出す、bpSplit.umbrellaRequired)
//   Step 1: Primary BP (Principal)
//   Step 2: Primary BP (Alternate)
//   Step 3: Primary BP (DRA 用、両 Haplotype 由来リード混在時のみ)
//   Step 4: BS (共通、MIGS variant)
//   Step 5: DRA Run
//   Step 6: MSS (Principal)
//   Step 7: MSS (Alternate)
//
// PoC 簡略: assembly fasta 行を chip haplotype-naming で Principal/Alternate に振り分け、
// それぞれ 1 つの代表行で MSS Step を生成。BS は 1 個共通 (state の biosamples[0] を再利用)。

import {
  HAPLOTYPE_NAMING_LABELS,
  HAPLOTYPE_ORGANISM_TO_MIGS_PACKAGE,
} from "@/lib/mock-data/submit-alt3"
import type {
  FileEntry,
  FlowStep,
  Submission,
} from "@/types/submit-alt3"

import type {
  BpSplitContext,
  JgaContext,
} from "./context"
import { UMBRELLA_STEP_ID } from "./rule02_umbrellaBioproject"
import {
  createStep,
  fileChipValue,
  mergeServiceDraft,
} from "./shared"

export const generateRule11Steps = (
  submission: Submission,
  bpSplit: BpSplitContext,
  jga: JgaContext,
): FlowStep[] => {
  if (!bpSplit.haplotypeMode) return []

  // JGA 対象 (restricted human) が混在している場合、Rule 6 で MSS 抑制 + Rule 11 は不発
  // (本 rule では eligible files のみ対象、JGA 行は除外)
  const eligibleFiles = submission.fileEntries.filter(
    (f) => !jga.jgaFileIds.has(f.id),
  )

  // assembly fasta 行を抽出 (data-form=assembled + haplotype-mode=phased)
  const assemblyFiles = eligibleFiles.filter(
    (f) =>
      f.dataForm === "assembled" &&
      fileChipValue(f, "haplotype-mode") === "phased",
  )

  const firstAssembly = assemblyFiles[0]
  if (!firstAssembly) return []

  // 命名規則 (chip haplotype-naming) を最初の assembly file から取得
  const naming = fileChipValue(firstAssembly, "haplotype-naming") ?? "principal-alternate"
  const defaultLabels = HAPLOTYPE_NAMING_LABELS["principal-alternate"] ?? {
    primary: "Principal",
    secondary: "Alternate",
  }
  const labels = HAPLOTYPE_NAMING_LABELS[naming] ?? defaultLabels

  // Principal / Alternate に file を振り分け (1 file = 1 phase、Group 単位で判定)
  // PoC では先頭半分を Principal、残りを Alternate (本来は modal で確定する FileGroup 別ラベル)
  // Group ID で安定ソート → 偶数 idx = Principal、奇数 idx = Alternate
  const groupedByGroupId = new Map<string, FileEntry[]>()
  for (const f of assemblyFiles) {
    const bucket = groupedByGroupId.get(f.groupId) ?? []
    bucket.push(f)
    groupedByGroupId.set(f.groupId, bucket)
  }
  const sortedGroups = Array.from(groupedByGroupId.entries()).sort(([a], [b]) => a.localeCompare(b))
  const principalFiles: FileEntry[] = []
  const alternateFiles: FileEntry[] = []
  sortedGroups.forEach(([, files], idx) => {
    if (idx % 2 === 0) principalFiles.push(...files)
    else alternateFiles.push(...files)
  })

  // raw 配列 file (両 Haplotype 由来混在判定)
  const rawFiles = eligibleFiles.filter((f) => f.dataForm === "raw")
  const hasDraSharedBp = rawFiles.length > 0

  // 共通 BS (state の biosamples 1 個目を再利用)
  const sharedBs = submission.biosamples[0]
  const sharedBsId = sharedBs?.id ?? "bs-haplotype-shared"

  // organism (代表 file から)
  const organism = firstAssembly.organism
  const migsPackage = organism
    ? (HAPLOTYPE_ORGANISM_TO_MIGS_PACKAGE[organism] ?? "model-organism-or-animal")
    : "model-organism-or-animal"

  const steps: FlowStep[] = []
  const upstreamUmbrella = bpSplit.umbrellaRequired ? [UMBRELLA_STEP_ID] : []

  // Step 1: Primary BP (Principal)
  const principalBpId = "bp-principal"
  const principalBpStepId = `step-primary-bioproject-${principalBpId}`
  steps.push(
    createStep({
      service: "primary-bioproject",
      discriminator: principalBpId,
      mergeKey: "primary-bioproject:haplotype:principal",
      targetGroupIds: Array.from(new Set(principalFiles.map((f) => f.groupId))),
      targetFileIds: principalFiles.map((f) => f.id),
      intraDbInputs: mergeServiceDraft(submission, principalBpStepId, {
        haplotypePhase: "principal",
        title: `${labels.primary} haplotype`,
        projectDataType: "Genome Sequencing",
      }),
      upstreamStepIds: upstreamUmbrella,
      titleOverride: "flowSteps.primary-bioproject.title",
      notes: [`routes.submitAlt3.flowGen.rule11.${naming}.primaryLabel`],
    }),
  )

  // Step 2: Primary BP (Alternate)
  const alternateBpId = "bp-alternate"
  const alternateBpStepId = `step-primary-bioproject-${alternateBpId}`
  steps.push(
    createStep({
      service: "primary-bioproject",
      discriminator: alternateBpId,
      mergeKey: "primary-bioproject:haplotype:alternate",
      targetGroupIds: Array.from(new Set(alternateFiles.map((f) => f.groupId))),
      targetFileIds: alternateFiles.map((f) => f.id),
      intraDbInputs: mergeServiceDraft(submission, alternateBpStepId, {
        haplotypePhase: "alternate",
        title: `${labels.secondary} haplotype`,
        projectDataType: "Genome Sequencing",
      }),
      upstreamStepIds: upstreamUmbrella,
      notes: [`routes.submitAlt3.flowGen.rule11.${naming}.secondaryLabel`],
    }),
  )

  // Step 3: Primary BP (DRA 用、raw が混在時のみ)
  let draBpStepId: string | undefined
  if (hasDraSharedBp) {
    const draBpId = "bp-dra-shared"
    draBpStepId = `step-primary-bioproject-${draBpId}`
    steps.push(
      createStep({
        service: "primary-bioproject",
        discriminator: draBpId,
        mergeKey: "primary-bioproject:haplotype:dra-shared",
        targetGroupIds: Array.from(new Set(rawFiles.map((f) => f.groupId))),
        targetFileIds: rawFiles.map((f) => f.id),
        intraDbInputs: mergeServiceDraft(submission, draBpStepId, {
          haplotypePhase: "dra-shared",
          title: "DRA reads (both Haplotypes mixed)",
          projectDataType: "Genome Sequencing",
        }),
        upstreamStepIds: upstreamUmbrella,
        notes: ["routes.submitAlt3.flowGen.rule11.draSharedNote"],
      }),
    )
  }

  // Step 4: BS (共通、MIGS variant 上書き)
  const bsStepId = `step-biosample-${sharedBsId}`
  steps.push(
    createStep({
      service: "biosample",
      discriminator: sharedBsId,
      mergeKey: "biosample:haplotype:shared",
      targetGroupIds: Array.from(
        new Set([
          ...assemblyFiles.map((f) => f.groupId),
          ...rawFiles.map((f) => f.groupId),
        ]),
      ),
      targetFileIds: [...assemblyFiles, ...rawFiles].map((f) => f.id),
      intraDbInputs: mergeServiceDraft(submission, bsStepId, {
        package: migsPackage,
        haplotypeShared: true,
        organismHint: organism,
      }),
      upstreamStepIds: [
        principalBpStepId,
        alternateBpStepId,
        ...(draBpStepId ? [draBpStepId] : []),
      ],
      notes: ["routes.submitAlt3.flowGen.rule11.sharedBsNote"],
    }),
  )

  // Step 5: DRA Run (raw)
  if (rawFiles.length > 0) {
    const draStepId = `step-dra-${sharedBsId}`
    steps.push(
      createStep({
        service: "dra",
        discriminator: sharedBsId,
        mergeKey: "dra:haplotype:shared",
        targetGroupIds: Array.from(new Set(rawFiles.map((f) => f.groupId))),
        targetFileIds: rawFiles.map((f) => f.id),
        intraDbInputs: mergeServiceDraft(submission, draStepId, {
          analysisKind: "Run",
        }),
        upstreamStepIds: [
          ...(draBpStepId ? [draBpStepId] : []),
          bsStepId,
        ],
      }),
    )
  }

  // Step 6 / 7: MSS (Principal / Alternate)
  if (principalFiles.length > 0) {
    const mssPrincipalStepId = `step-mss-${principalBpId}`
    steps.push(
      createStep({
        service: "mss",
        discriminator: principalBpId,
        mergeKey: "mss:haplotype:principal",
        targetGroupIds: Array.from(new Set(principalFiles.map((f) => f.groupId))),
        targetFileIds: principalFiles.map((f) => f.id),
        intraDbInputs: mergeServiceDraft(submission, mssPrincipalStepId, {
          dataType: "WGS",
          stComment: `Diploid :: ${labels.primary} haplotype`,
          haplotypePhase: "principal",
        }),
        upstreamStepIds: [principalBpStepId, bsStepId],
        notes: [`routes.submitAlt3.flowGen.rule11.${naming}.primaryLabel`],
      }),
    )
  }
  if (alternateFiles.length > 0) {
    const mssAlternateStepId = `step-mss-${alternateBpId}`
    steps.push(
      createStep({
        service: "mss",
        discriminator: alternateBpId,
        mergeKey: "mss:haplotype:alternate",
        targetGroupIds: Array.from(new Set(alternateFiles.map((f) => f.groupId))),
        targetFileIds: alternateFiles.map((f) => f.id),
        intraDbInputs: mergeServiceDraft(submission, mssAlternateStepId, {
          dataType: "WGS",
          stComment: `Diploid :: ${labels.secondary} haplotype`,
          haplotypePhase: "alternate",
        }),
        upstreamStepIds: [alternateBpStepId, bsStepId],
        notes: [`routes.submitAlt3.flowGen.rule11.${naming}.secondaryLabel`],
      }),
    )
  }

  return steps
}
