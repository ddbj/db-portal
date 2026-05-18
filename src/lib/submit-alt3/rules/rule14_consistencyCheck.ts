// Rule 14: Step カード入力による chip 整合チェック
// SSOT: docs/submit-alt3-flow-rules.md §8.1 Rule 14a / 14b / 14c
//
// 各 Step の intraDbInputs (DRA Library Strategy / Source、MSS DATATYPE) と chip 値 (functional-genomics, assembly-form) を比較。
// mismatch を検出したら warning を生成して Step.warnings に追加。
// warning ID は Step ID + 入力 field + 入力値 + chip axis + chip 値 で deterministic に決まる (dismissed 状態がリセットされる条件は ID 変化)。

import type {
  DraLibrarySource,
  DraLibraryStrategy,
  MssDataType,
} from "@/lib/mock-data/submit-alt3"
import {
  AMPLICON_METAGENOMIC_EXPECTED_CHIP,
  LIBRARY_SOURCE_INFO,
  LIBRARY_STRATEGY_CONSISTENCY,
  MSS_DATATYPE_CONSISTENCY,
} from "@/lib/mock-data/submit-alt3"
import type {
  AssemblyForm,
  FileEntry,
  FlowStep,
  FlowWarning,
  FunctionalGenomics,
  Submission,
} from "@/types/submit-alt3"

import { fileChipValue } from "./shared"

// chip + 列の値を Step ID + 入力 field + 値で warning ID 化
const buildWarningId = (params: {
  stepId: string
  inputField: string
  inputValue: string
  chipAxis: string
  chipValue: string
}): string =>
  `${params.stepId}:rule14:${params.inputField}=${params.inputValue}|${params.chipAxis}=${params.chipValue}`

// Step の対象 file の chip 値を多数決で取得 (PoC は最初の file の chip 値)
const repFile = (
  submission: Submission,
  step: FlowStep,
): FileEntry | undefined =>
  submission.fileEntries.find((f) => step.targetFileIds.includes(f.id))

export const applyRule14Consistency = (
  submission: Submission,
  steps: FlowStep[],
): FlowStep[] =>
  steps.map((step) => {
    const newWarnings: FlowWarning[] = []

    if (step.service === "dra") {
      newWarnings.push(...checkDraStrategy(submission, step))
      newWarnings.push(...checkDraSource(submission, step))
    }
    if (step.service === "mss") {
      newWarnings.push(...checkMssDataType(submission, step))
    }

    return { ...step, warnings: [...step.warnings, ...newWarnings] }
  })

// ----- DRA Library Strategy vs functional-genomics 整合 -----

const checkDraStrategy = (
  submission: Submission,
  step: FlowStep,
): FlowWarning[] => {
  const strategy = step.intraDbInputs.libraryStrategy as DraLibraryStrategy | undefined
  const source = step.intraDbInputs.librarySource as DraLibrarySource | undefined
  if (strategy === undefined || strategy === "Other") return []

  const rep = repFile(submission, step)
  if (!rep) return []

  const fg = fileChipValue(rep, "functional-genomics") as FunctionalGenomics | undefined
  if (fg === undefined) return []

  const warnings: FlowWarning[] = []

  // AMPLICON + METAGENOMIC 特殊条件
  if (strategy === "AMPLICON" && source === "METAGENOMIC") {
    if (fg !== AMPLICON_METAGENOMIC_EXPECTED_CHIP) {
      warnings.push({
        id: buildWarningId({
          stepId: step.id,
          inputField: "libraryStrategy",
          inputValue: `${strategy}+${source}`,
          chipAxis: "functional-genomics",
          chipValue: fg,
        }),
        severity: "warning",
        messageKey: "routes.submitAlt3.flowGen.rule14.warning.amplicon_metagenomic",
        messageParams: { strategy, currentChip: fg },
        actionHints: {
          chipFileId: rep.id,
          chipAxis: "functional-genomics",
          suggestedChipValue: AMPLICON_METAGENOMIC_EXPECTED_CHIP,
          stepInputField: "libraryStrategy",
        },
      })

      return warnings
    }
  }

  // 通常 strategy → expected functional-genomics
  for (const rule of LIBRARY_STRATEGY_CONSISTENCY) {
    if (!rule.strategies.includes(strategy)) continue
    if (rule.expectedFunctionalGenomics.includes(fg)) continue

    warnings.push({
      id: buildWarningId({
        stepId: step.id,
        inputField: "libraryStrategy",
        inputValue: strategy,
        chipAxis: "functional-genomics",
        chipValue: fg,
      }),
      severity: rule.severity,
      messageKey: `routes.submitAlt3.flowGen.rule14.warning.${rule.warningCaseKey}`,
      messageParams: { strategy, currentChip: fg },
      actionHints: {
        chipFileId: rep.id,
        chipAxis: "functional-genomics",
        ...(rule.suggestedChipValue !== undefined
          ? { suggestedChipValue: rule.suggestedChipValue }
          : {}),
        stepInputField: "libraryStrategy",
      },
    })
    break // 1 mismatch だけ報告
  }

  return warnings
}

// ----- DRA Library Source vs functional-genomics 整合 (info-only ケース) -----

const checkDraSource = (
  submission: Submission,
  step: FlowStep,
): FlowWarning[] => {
  const source = step.intraDbInputs.librarySource as DraLibrarySource | undefined
  if (source === undefined) return []

  const rep = repFile(submission, step)
  if (!rep) return []
  const fg = fileChipValue(rep, "functional-genomics") as FunctionalGenomics | undefined
  if (fg === undefined) return []

  const warnings: FlowWarning[] = []
  for (const rule of LIBRARY_SOURCE_INFO) {
    if (!rule.sources.includes(source)) continue
    if (rule.expectedFunctionalGenomics.includes(fg)) continue

    warnings.push({
      id: buildWarningId({
        stepId: step.id,
        inputField: "librarySource",
        inputValue: source,
        chipAxis: "functional-genomics",
        chipValue: fg,
      }),
      severity: rule.severity,
      messageKey: `routes.submitAlt3.flowGen.rule14.warning.${rule.warningCaseKey}`,
      messageParams: { source, currentChip: fg },
      actionHints: {
        chipFileId: rep.id,
        chipAxis: "functional-genomics",
        stepInputField: "librarySource",
      },
    })
    break
  }

  return warnings
}

// ----- MSS DATATYPE vs chip assembly-form / functional-genomics 整合 -----

const checkMssDataType = (
  submission: Submission,
  step: FlowStep,
): FlowWarning[] => {
  const dataType = step.intraDbInputs.dataType as MssDataType | undefined
  if (dataType === undefined) return []

  const rep = repFile(submission, step)
  if (!rep) return []

  const assemblyForm = fileChipValue(rep, "assembly-form") as AssemblyForm | undefined
  const fg = fileChipValue(rep, "functional-genomics") as FunctionalGenomics | undefined

  const warnings: FlowWarning[] = []
  for (const rule of MSS_DATATYPE_CONSISTENCY) {
    if (!rule.dataTypes.includes(dataType)) continue

    const formMismatch =
      assemblyForm !== undefined && !rule.expectedAssemblyForm.includes(assemblyForm)
    const fgMismatch =
      fg !== undefined && !rule.expectedFunctionalGenomics.includes(fg)

    if (!formMismatch && !fgMismatch) continue
    if (rule.severity === "info" && !formMismatch && !fgMismatch) continue

    const params: Record<string, string> = { dataType }
    if (assemblyForm !== undefined) params.currentForm = assemblyForm
    if (fg !== undefined) params.currentChip = fg

    const suggested = rule.expectedAssemblyForm[0]
    warnings.push({
      id: buildWarningId({
        stepId: step.id,
        inputField: "dataType",
        inputValue: dataType,
        chipAxis: "assembly-form",
        chipValue: assemblyForm ?? "(unset)",
      }),
      severity: rule.severity,
      messageKey: `routes.submitAlt3.flowGen.rule14.warning.${rule.warningCaseKey}`,
      messageParams: params,
      actionHints: {
        chipFileId: rep.id,
        chipAxis: "assembly-form",
        ...(suggested !== undefined ? { suggestedChipValue: suggested } : {}),
        stepInputField: "dataType",
      },
    })
    break
  }

  return warnings
}
