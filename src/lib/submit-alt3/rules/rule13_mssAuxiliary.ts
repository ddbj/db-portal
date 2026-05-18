// Rule 13: MSS Step の補助フィールド (INSDC FF / Annotation 制約)
// SSOT: docs/submit-alt3-flow-rules.md §8.1 Rule 13 + docs/submit-alt3-tags.md §5.6
//
// 既存 MSS Step (rule04 / rule07 / rule08 / rule11 が生成) に対して自動推測値を追記する後処理。
// - DIVISION: organism + assembly-form から推測 (ORGANISM_TO_DEFAULT_DIVISION + ASSEMBLY_FORM_TO_DIVISION_OVERRIDE)
// - DATATYPE: assembly-form から推測 (ASSEMBLY_FORM_TO_DATATYPE)
// - KEYWORDS: TPA 系は rule07 で自動付与済み、HTG phase はここで付与、それ以外は notes リンクのみ
//
// orchestrator から呼ばれ、Steps 配列に対して in-place の代わりに新規 Step 配列を返す。

import {
  ASSEMBLY_FORM_TO_DATATYPE,
  ASSEMBLY_FORM_TO_DIVISION_OVERRIDE,
  INSDC_KEYWORDS_URL,
  type MssDataType,
  type MssDivision,
  ORGANISM_TO_DEFAULT_DIVISION,
} from "@/lib/mock-data/submit-alt3"
import type {
  AssemblyForm,
  FileEntry,
  FlowStep,
  Organism,
  Submission,
} from "@/types/submit-alt3"

import { fileChipValue } from "./shared"

const inferDivisionAndDataType = (
  files: readonly FileEntry[],
): { division?: MssDivision; dataType?: MssDataType; assemblyForm?: AssemblyForm } => {
  // 代表 file: assembled file を優先
  const rep = files.find((f) => f.dataForm === "assembled") ?? files[0]
  if (!rep) return {}

  const assemblyFormRaw = fileChipValue(rep, "assembly-form")
  const assemblyForm = (assemblyFormRaw as AssemblyForm | undefined)
  const organism = rep.organism as Organism | undefined

  let division: MssDivision | undefined =
    organism !== undefined ? ORGANISM_TO_DEFAULT_DIVISION[organism] : undefined

  if (assemblyForm !== undefined) {
    const override = ASSEMBLY_FORM_TO_DIVISION_OVERRIDE[assemblyForm]
    if (override !== undefined) division = override
  }

  const dataType: MssDataType | undefined =
    assemblyForm !== undefined ? ASSEMBLY_FORM_TO_DATATYPE[assemblyForm] : undefined

  const result: { division?: MssDivision; dataType?: MssDataType; assemblyForm?: AssemblyForm } = {}
  if (division !== undefined) result.division = division
  if (dataType !== undefined) result.dataType = dataType
  if (assemblyForm !== undefined) result.assemblyForm = assemblyForm

  return result
}

export const applyRule13Auxiliary = (
  submission: Submission,
  steps: FlowStep[],
): FlowStep[] =>
  steps.map((step) => {
    if (step.service !== "mss") return step

    const targetFiles = submission.fileEntries.filter((f) =>
      step.targetFileIds.includes(f.id),
    )
    const { division, dataType, assemblyForm } =
      inferDivisionAndDataType(targetFiles)

    // 既に rule07 / rule08 / rule11 が dataType / division を inputs に入れている場合はそれを優先
    const existing = step.intraDbInputs
    const intraDbInputs = {
      ...existing,
      division: existing.division ?? division,
      dataType: existing.dataType ?? dataType,
      assemblyForm: existing.assemblyForm ?? assemblyForm,
      keywordsReferenceUrl: INSDC_KEYWORDS_URL,
    }

    // HTG phase auto-append (HTG の場合、phase notes を出す)
    const extraNotes: string[] = []
    if (assemblyForm === "htg") {
      extraNotes.push("routes.submitAlt3.flowGen.rule13.htgPhaseNote")
    }
    // KEYWORDS notes (TPA 系は rule07 で自動付与、ここでは generic 案内)
    extraNotes.push("routes.submitAlt3.flowGen.rule13.keywordsReferenceNote")
    extraNotes.push(INSDC_KEYWORDS_URL)

    return {
      ...step,
      intraDbInputs,
      notes: [...step.notes, ...extraNotes],
    }
  })
