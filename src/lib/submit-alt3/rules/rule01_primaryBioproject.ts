// Rule 1: Primary BioProject Step
// SSOT: docs/submit-alt3-flow-rules.md §8.1 Rule 1
//
// 各 Primary BP 論理単位 (BpSplitContext.assignments) に対して 1 Step を生成。
// Project Data Type は Rule 1 優先順序 (13 段) で確定。
// Haplotype phased ケース (Rule 11) は haplotypeMode=true で本 rule をスキップし、rule11 側で 4 BP 構造を生成。

import type { BpProjectDataType } from "@/lib/mock-data/submit-alt3"
import type {
  FileEntry,
  FlowStep,
  Submission,
} from "@/types/submit-alt3"

import type {
  BpSplitContext,
  PrimaryBpAssignment,
} from "./context"
import {
  createStep,
  fileChipValue,
  mergeServiceDraft,
} from "./shared"

// Rule 1 優先順序 13 段で BpProjectDataType を決定 (assignment 内 files に対して)。
export const inferProjectDataType = (
  files: readonly FileEntry[],
): BpProjectDataType => {
  if (files.length === 0) return "Other"

  const has = (predicate: (f: FileEntry) => boolean): boolean =>
    files.some(predicate)
  const allMatch = (predicate: (f: FileEntry) => boolean): boolean =>
    files.every(predicate)

  // 1. variation ButtonType がある
  if (has((f) => f.buttonType === "variation")) return "Variation"

  // 2. mass-spec + proteomics
  if (
    has(
      (f) =>
        f.buttonType === "mass-spec" &&
        fileChipValue(f, "mass-spec-domain") === "proteomics",
    )
  ) return "Proteome"

  // 3. mass-spec + (metabolomics | imaging)
  if (
    has((f) => {
      if (f.buttonType !== "mass-spec") return false
      const d = fileChipValue(f, "mass-spec-domain")

      return d === "metabolomics" || d === "imaging"
    })
  ) return "Other"

  // 4. phenotype-only
  if (allMatch((f) => f.buttonType === "phenotype")) {
    return "Phenotype and Genotype"
  }

  // 5. expression / spatial-tx
  if (
    has(
      (f) =>
        f.buttonType === "expression-array" ||
        f.buttonType === "expression-matrix" ||
        f.buttonType === "spatial-tx",
    )
  ) return "Transcriptome or Gene Expression"

  // 6. functional-genomics=metagenome-target
  if (has((f) => fileChipValue(f, "functional-genomics") === "metagenome-target")) {
    return "Metagenome"
  }

  // 7. data-form=assembled + assembly-form ∈ {tsa, htc, est}
  if (
    has((f) => {
      if (f.dataForm !== "assembled") return false
      const af = fileChipValue(f, "assembly-form")

      return af === "tsa" || af === "htc" || af === "est"
    })
  ) return "Transcriptome or Gene Expression"

  // 8. data-form=assembled + assembly-form=tls
  if (
    has(
      (f) =>
        f.dataForm === "assembled" &&
        fileChipValue(f, "assembly-form") === "tls",
    )
  ) return "Targeted Locus"

  // 9. data-form=assembled + assembly-form=gss
  if (
    has(
      (f) =>
        f.dataForm === "assembled" &&
        fileChipValue(f, "assembly-form") === "gss",
    )
  ) return "Random Survey"

  // 10. data-form=assembled + assembly-form ∈ {wgs, gnm, htg}
  if (
    has((f) => {
      if (f.dataForm !== "assembled") return false
      const af = fileChipValue(f, "assembly-form")

      return af === "wgs" || af === "gnm" || af === "htg"
    })
  ) return "Genome Sequencing"

  // 11. data-form=raw + functional-genomics=wes-target
  if (
    has(
      (f) =>
        f.dataForm === "raw" &&
        fileChipValue(f, "functional-genomics") === "wes-target",
    )
  ) return "Exome"

  // 12. data-form=raw + organism existing
  if (has((f) => f.dataForm === "raw" && f.organism !== undefined)) {
    return "Genome Sequencing"
  }

  // 13. fallback
  return "Other"
}

const filesForAssignment = (
  submission: Submission,
  assignment: PrimaryBpAssignment,
): FileEntry[] =>
  submission.fileEntries.filter((f) => assignment.fileIds.has(f.id))

export const generateRule1Steps = (
  submission: Submission,
  bpSplit: BpSplitContext,
  umbrellaStepId: string | undefined,
): FlowStep[] => {
  // Haplotype phased の場合は rule11 が 4 BP 構造を生成するので本 rule をスキップ
  if (bpSplit.haplotypeMode) return []

  const steps: FlowStep[] = []

  for (const assignment of bpSplit.assignments) {
    const files = filesForAssignment(submission, assignment)
    const projectDataType = inferProjectDataType(files)

    const stepId = `step-primary-bioproject-${assignment.bpId}`
    const autoInputs: Record<string, unknown> = {
      projectDataType,
      commonLineage: assignment.commonLineage,
    }

    const step = createStep({
      service: "primary-bioproject",
      discriminator: assignment.bpId,
      targetGroupIds: Array.from(assignment.groupIds),
      targetFileIds: Array.from(assignment.fileIds),
      intraDbInputs: mergeServiceDraft(submission, stepId, autoInputs),
      upstreamStepIds: umbrellaStepId ? [umbrellaStepId] : [],
    })

    steps.push(step)
  }

  return steps
}
