// Rule 6: JGA 集約モード + DBCLS Step 0
// SSOT: docs/submit-alt3-flow-rules.md §8.1 Rule 6 / 6a / 6b / 6c
//
// 発火条件: organism ∈ {human, human-microbiome} + access=restricted の行が 1 件以上 (jgaCtx.enabled)
//
// PoC スコープでは JGA は単一 Step に集約する (docs/submit-alt3-flow-rules.md Rule 6 共通):
//   - JGA 8 オブジェクト (Submission / Study / Sample / Experiment / Data / Analysis / Dataset / Policy) は
//     全て **同一の JGA 申請管理システム** で登録される。Step を 8 個に並べる必然性はなく、
//     1 Step カード内で「JGA システム側で順に登録する 8 種」を notes として案内する
//   - intraDbInputs は空 {} (XSD 入力 UI を内包しない、外部誘導のみ)
//   - issuedAccessionTypes に 8 prefix (JGA / JGAS / JGAN / JGAX / JGAR / JGAZ / JGAD / JGAP) を並べる
//   - serviceUrl は SERVICE_URLS["jga"] = JGA 案内ページが自動付与される
//
// 生成 Step (物理表示順序、data-model.md §4.6.0):
//   Step 0: dbcls-application (外部、事前申請)
//   Step 1: jga                (内部、notes-only、8 オブジェクトを集約)
//   (続いて Rule 12 の humandbs Step が jga を upstream に持って生成される)
//
// 各 sub-rule の判定 (Step 内 notes に反映):
//   6a (raw 配列系): dataForm=raw が含まれれば Experiment + Data を案内
//   6b (Sample-Analysis): dataForm ∈ {analysis-output, matrix, mass-spec, assembled} が含まれれば Analysis を案内
//   6c (phenotype-only): 全 file が ButtonType=phenotype のみ → Experiment/Data/Analysis をスキップし Sample → Dataset 直結を案内

import {
  DDBJ_CONTACT_URL,
  EXTERNAL_SERVICE_URLS,
} from "@/lib/mock-data/submit-alt3"
import type {
  FlowStep,
  Submission,
} from "@/types/submit-alt3"

import type { JgaContext } from "./context"
import {
  createStep,
  mergeServiceDraft,
} from "./shared"

const JGA_PREP_NOTE_PREFIX = "routes.submitAlt3.flowGen.rule06.jgaPrep"

export const generateRule6Steps = (
  submission: Submission,
  jga: JgaContext,
): FlowStep[] => {
  if (!jga.enabled) return []

  const jgaFiles = submission.fileEntries.filter((f) => jga.jgaFileIds.has(f.id))
  const jgaGroups = submission.fileGroups.filter((g) =>
    jga.jgaGroupIds.has(g.id),
  )

  const hasRaw = jgaFiles.some((f) => f.dataForm === "raw")
  const hasAnalysisOutput = jgaFiles.some(
    (f) =>
      f.dataForm === "analysis-output" ||
      f.dataForm === "matrix" ||
      f.dataForm === "mass-spec" ||
      f.dataForm === "assembled",
  )
  const phenotypeOnly =
    jgaFiles.length > 0 &&
    jgaFiles.every((f) => f.buttonType === "phenotype")

  const steps: FlowStep[] = []
  const dbclsUrl = EXTERNAL_SERVICE_URLS["dbcls-application"]?.url ?? DDBJ_CONTACT_URL

  // Step 0: DBCLS 事前申請
  steps.push(
    createStep({
      service: "dbcls-application",
      targetGroupIds: jgaGroups.map((g) => g.id),
      targetFileIds: jgaFiles.map((f) => f.id),
      intraDbInputs: mergeServiceDraft(submission, "step-dbcls-application", {
        applicationUrl: dbclsUrl,
      }),
      upstreamStepIds: [],
      notes: [
        "routes.submitAlt3.flowGen.rule06.dbclsApplication.notes",
        dbclsUrl,
      ],
    }),
  )

  // Step 1: JGA (8 オブジェクトを集約した単一 Step、notes-only)
  // notes の組み立て方針:
  //   1. 共通の overview ノート (JGA は別系統、申請後 sftp upload 等)
  //   2. 各 JGA オブジェクトの prep checklist (Submission / Study / Sample 等、Rule 6a/6b/6c で条件分岐)
  //   3. Rule 6b の追加注意 (1 Analysis = 1 VCF)
  //   4. Rule 6c の phenotype-only モード案内
  //   5. Rule 10c の不明判定時の DBCLS 相談案内 (phenotype-only かつ access 暫定 restricted のケース)
  const jgaNotes: string[] = [
    `${JGA_PREP_NOTE_PREFIX}.overview`,
    `${JGA_PREP_NOTE_PREFIX}.submission`,
    `${JGA_PREP_NOTE_PREFIX}.study`,
    `${JGA_PREP_NOTE_PREFIX}.sample`,
  ]
  if (hasRaw && !phenotypeOnly) {
    jgaNotes.push(
      `${JGA_PREP_NOTE_PREFIX}.experiment`,
      `${JGA_PREP_NOTE_PREFIX}.data`,
    )
  }
  if (hasAnalysisOutput && !phenotypeOnly) {
    jgaNotes.push(
      `${JGA_PREP_NOTE_PREFIX}.analysis`,
      "routes.submitAlt3.flowGen.rule06b.analysisNotes",
    )
  }
  jgaNotes.push(`${JGA_PREP_NOTE_PREFIX}.dataset`)
  if (phenotypeOnly) {
    jgaNotes.push("routes.submitAlt3.flowGen.rule06c.phenotypeOnlyDataset")
  }
  jgaNotes.push(`${JGA_PREP_NOTE_PREFIX}.policy`)
  if (phenotypeOnly) {
    jgaNotes.push(
      "routes.submitAlt3.flowGen.rule10c.jgaSampleNotes",
      DDBJ_CONTACT_URL,
      dbclsUrl,
    )
  }

  steps.push(
    createStep({
      service: "jga",
      targetGroupIds: jgaGroups.map((g) => g.id),
      targetFileIds: jgaFiles.map((f) => f.id),
      upstreamStepIds: ["step-dbcls-application"],
      notes: jgaNotes,
    }),
  )

  return steps
}

// orchestrator が「Rule 6 集約発火時に MSS/MetaboBank 等を抑制する」判定に使う
export const isJgaAggregated = (jga: JgaContext): boolean => jga.enabled
