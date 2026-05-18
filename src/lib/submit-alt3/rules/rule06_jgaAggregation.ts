// Rule 6: JGA 集約モード + DBCLS Step 0
// SSOT: docs/submit-alt3-flow-rules.md §8.1 Rule 6 / 6a / 6b / 6c
//
// 発火条件: organism ∈ {human, human-microbiome} + access=restricted の行が 1 件以上 (jgaCtx.enabled)
//
// 生成 Step (物理表示順序、data-model.md §4.6.0):
//   Step 0: dbcls-application (外部)
//   Step 1: jga-submission
//   Step 2: jga-study
//   Step 3: jga-sample × N (per-BS、各 BS は jgaGroupIds 内 Group で対応)
//   Step 4: jga-experiment (raw 配列由来あれば)
//   Step 5: jga-data       (raw 配列由来あれば)
//   Step 6: jga-analysis   (Sample-Analysis チェーン、per-sample VCF / aggregate / array / metabolomics)
//   Step 7: jga-dataset    (phenotype 単独 / 配列+変異+表現型 Dataset)
//   Step 8: jga-policy
//
// 各 sub-rule の判定:
//   6a (raw 配列系): jgaGroupIds 内に dataForm=raw の Group があれば Experiment + Data を出す
//   6b (Sample-Analysis): dataForm ∈ {analysis-output, matrix, mass-spec} があれば Analysis を出す
//   6c (phenotype-only): jgaGroupIds 内全 file が ButtonType=phenotype のみ → Experiment/Data/Analysis 抑制、Sample→Dataset 直結

import {
  DDBJ_CONTACT_URL,
  EXTERNAL_SERVICE_URLS,
} from "@/lib/mock-data/submit-alt3"
import type {
  FileEntry,
  FlowStep,
  Submission,
} from "@/types/submit-alt3"

import type { JgaContext } from "./context"
import {
  createStep,
  mergeServiceDraft,
} from "./shared"

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

  const dbclsId = "step-dbcls-application"

  // Step 1: JGA Submission
  steps.push(
    createStep({
      service: "jga-submission",
      targetGroupIds: jgaGroups.map((g) => g.id),
      targetFileIds: jgaFiles.map((f) => f.id),
      intraDbInputs: mergeServiceDraft(submission, "step-jga-submission", {}),
      upstreamStepIds: [dbclsId],
    }),
  )
  const submissionId = "step-jga-submission"

  // Step 2: JGA Study
  steps.push(
    createStep({
      service: "jga-study",
      targetGroupIds: jgaGroups.map((g) => g.id),
      targetFileIds: jgaFiles.map((f) => f.id),
      intraDbInputs: mergeServiceDraft(submission, "step-jga-study", {}),
      upstreamStepIds: [submissionId],
    }),
  )
  const studyId = "step-jga-study"

  // Step 3: JGA Sample × N (per-BS、PoC は jgaGroup 単位で 1 Sample)
  // phenotype-only Group では「個人数 N」をユーザー入力 (Rule 6c)
  // raw 配列系では Group の sample 数 (multiplex なら N、それ以外 1)
  // 集計 VCF はユーザー入力 N (Rule 6a 「Step 3 の JGA Sample 数 N の決まり方」)
  //
  // PoC では Group 1 個 → JGA Sample 1 個として Step を出し、Step 内 list UI で N 個展開する想定。
  // Step は per-group ではなく per-BS に対応。
  const sampleStepIds: string[] = []
  for (const bs of submission.biosamples) {
    const bsGroupId = bs.sourceGroupIds[0]
    if (bsGroupId === undefined) continue
    if (!jga.jgaGroupIds.has(bsGroupId)) continue

    const stepId = `step-jga-sample-${bs.id}`
    sampleStepIds.push(stepId)
    const targetGroup = submission.fileGroups.find((g) => g.id === bsGroupId)

    steps.push(
      createStep({
        service: "jga-sample",
        discriminator: bs.id,
        targetGroupIds: [bsGroupId],
        targetFileIds: targetGroup?.memberFileIds ?? [],
        intraDbInputs: mergeServiceDraft(submission, stepId, {
          // 集計 / phenotype-only ケースで N を入力するための placeholder
          jgaSampleCount: undefined,
        }),
        upstreamStepIds: [studyId],
        // Rule 10c: 個人特定不明 → Curator/DBCLS 相談 notes
        notes: phenotypeOnly
          ? [
            "routes.submitAlt3.flowGen.rule10c.jgaSampleNotes",
            DDBJ_CONTACT_URL,
            dbclsUrl,
          ]
          : [],
      }),
    )
  }

  if (sampleStepIds.length === 0) {
    // fallback: BS が無い場合でも JGA Sample Step を 1 個出す
    const stepId = "step-jga-sample"
    sampleStepIds.push(stepId)
    steps.push(
      createStep({
        service: "jga-sample",
        targetGroupIds: jgaGroups.map((g) => g.id),
        targetFileIds: jgaFiles.map((f) => f.id),
        intraDbInputs: mergeServiceDraft(submission, stepId, {}),
        upstreamStepIds: [studyId],
      }),
    )
  }

  // 6a (raw): Step 4: jga-experiment, Step 5: jga-data
  if (hasRaw && !phenotypeOnly) {
    steps.push(
      createStep({
        service: "jga-experiment",
        targetGroupIds: jgaGroups
          .filter((g) =>
            g.memberFileIds.some((id) =>
              jgaFiles.some((f) => f.id === id && f.dataForm === "raw"),
            ),
          )
          .map((g) => g.id),
        targetFileIds: jgaFiles.filter((f) => f.dataForm === "raw").map((f) => f.id),
        intraDbInputs: mergeServiceDraft(submission, "step-jga-experiment", {}),
        upstreamStepIds: sampleStepIds,
      }),
    )
    steps.push(
      createStep({
        service: "jga-data",
        targetGroupIds: jgaGroups
          .filter((g) =>
            g.memberFileIds.some((id) =>
              jgaFiles.some((f) => f.id === id && f.dataForm === "raw"),
            ),
          )
          .map((g) => g.id),
        targetFileIds: jgaFiles.filter((f) => f.dataForm === "raw").map((f) => f.id),
        intraDbInputs: mergeServiceDraft(submission, "step-jga-data", {}),
        upstreamStepIds: ["step-jga-experiment"],
      }),
    )
  }

  // 6b (Sample-Analysis): Step 6: jga-analysis
  if (hasAnalysisOutput && !phenotypeOnly) {
    steps.push(
      createStep({
        service: "jga-analysis",
        targetGroupIds: jgaGroups
          .filter((g) =>
            g.memberFileIds.some((id) =>
              jgaFiles.some(
                (f) =>
                  f.id === id &&
                  (f.dataForm === "analysis-output" ||
                    f.dataForm === "matrix" ||
                    f.dataForm === "mass-spec" ||
                    f.dataForm === "assembled"),
              ),
            ),
          )
          .map((g) => g.id),
        targetFileIds: jgaFiles
          .filter(
            (f) =>
              f.dataForm === "analysis-output" ||
              f.dataForm === "matrix" ||
              f.dataForm === "mass-spec" ||
              f.dataForm === "assembled",
          )
          .map((f) => f.id),
        intraDbInputs: mergeServiceDraft(submission, "step-jga-analysis", {}),
        upstreamStepIds: sampleStepIds,
        notes: ["routes.submitAlt3.flowGen.rule06b.analysisNotes"],
      }),
    )
  }

  // Step 7: jga-dataset (常に生成、phenotype-only / Dataset 集約両対応)
  // 6c phenotype-only の場合は Sample → Dataset 直結 (Experiment/Data/Analysis 抑制)
  const datasetUpstreams = phenotypeOnly
    ? sampleStepIds
    : (() => {
      const ids: string[] = []
      if (hasRaw) ids.push("step-jga-data")
      if (hasAnalysisOutput) ids.push("step-jga-analysis")

      return ids.length > 0 ? ids : sampleStepIds
    })()

  steps.push(
    createStep({
      service: "jga-dataset",
      targetGroupIds: jgaGroups.map((g) => g.id),
      targetFileIds: jgaFiles.map((f) => f.id),
      intraDbInputs: mergeServiceDraft(submission, "step-jga-dataset", {
        phenotypeOnly,
      }),
      upstreamStepIds: datasetUpstreams,
      notes: phenotypeOnly
        ? ["routes.submitAlt3.flowGen.rule06c.phenotypeOnlyDataset"]
        : [],
    }),
  )

  // Step 8: jga-policy
  steps.push(
    createStep({
      service: "jga-policy",
      targetGroupIds: jgaGroups.map((g) => g.id),
      targetFileIds: jgaFiles.map((f) => f.id),
      intraDbInputs: mergeServiceDraft(submission, "step-jga-policy", {}),
      upstreamStepIds: ["step-jga-dataset"],
    }),
  )

  return steps
}

// orchestrator が「Rule 6 集約発火時に MSS/MetaboBank 等を抑制する」判定に使う
export const isJgaAggregated = (jga: JgaContext): boolean => jga.enabled

// unused-vars: jgaFiles 内部 helper を export しないが、jgaCtx を使う他 rule のために
// targetFileIds 算出ロジックの参考として残す
const _unused = (f: FileEntry): FileEntry => f
void _unused
