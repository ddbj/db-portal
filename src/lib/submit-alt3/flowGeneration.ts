// submit-alt3 純粋関数 generateFlowCard (Phase C orchestrator 版)
// SSOT:
// - docs/submit-alt3-flow-rules.md §8.1 Rule 1-15
// - docs/submit-alt3-data-model.md §4.6.0 (物理表示順序) / §4.6.1 (Step ID 命名)
//
// orchestrator は context (jga / bpSplit) を事前計算し、Rule 1-15 を順次呼び出して
// Steps 配列を組み立て、後処理 (Rule 13/14/15 + dismissedWarnings 反映 + 物理順序ソート + 外部 Service enrichment)
// を適用してから FlowCard を返す。

import { SERVICE_PHYSICAL_ORDER } from "@/lib/mock-data/submit-alt3"
import type {
  FlowCard,
  FlowStep,
  FlowWarning,
  ServiceKind,
  Submission,
} from "@/types/submit-alt3"

import { enrichStepsWithDescriptions } from "./enrichSteps"
import { mergeStepsByMergeKey } from "./mergeSteps"
import { computeFlowGenContext } from "./rules/context"
import { generateRule1Steps } from "./rules/rule01_primaryBioproject"
import { generateRule2Step } from "./rules/rule02_umbrellaBioproject"
import { generateRule3Steps } from "./rules/rule03_biosample"
import { generateRule4Steps } from "./rules/rule04_perRowServiceRouting"
import { generateRule6Steps } from "./rules/rule06_jgaAggregation"
import { generateRule7Steps } from "./rules/rule07_thirdParty"
import { generateRule8Steps } from "./rules/rule08_magSagChain"
import { generateRule9Steps } from "./rules/rule09_multiplex"
import { generateRule10Steps } from "./rules/rule10_phenotype"
import { generateRule11Steps } from "./rules/rule11_haplotypePhased"
import {
  enrichExternalServiceSteps,
  generateRule12Steps,
} from "./rules/rule12_externalServices"
import { applyRule13Auxiliary } from "./rules/rule13_mssAuxiliary"
import { applyRule14Consistency } from "./rules/rule14_consistencyCheck"
import {
  applyRule15Notes,
  evaluateRule15,
} from "./rules/rule15_hybridAssembly"
import { hasUnsetColumn } from "./rules/shared"

// ----- 物理表示順序ソート -----
// §4.6.0 の固定順序で並べる。同 service 内は Step ID 昇順 (deterministic)。

const servicePhysicalRank = (service: ServiceKind): number => {
  const idx = SERVICE_PHYSICAL_ORDER.indexOf(service)

  return idx === -1 ? SERVICE_PHYSICAL_ORDER.length : idx
}

const sortStepsByPhysicalOrder = (steps: FlowStep[]): FlowStep[] =>
  [...steps].sort((a, b) => {
    const ra = servicePhysicalRank(a.service)
    const rb = servicePhysicalRank(b.service)
    if (ra !== rb) return ra - rb

    return a.id.localeCompare(b.id)
  })

// ----- dismissedWarnings → acknowledged 反映 + 重複 warning 除去 -----

const applyDismissedWarnings = (
  submission: Submission,
  steps: FlowStep[],
): FlowStep[] =>
  steps.map((step) => ({
    ...step,
    warnings: dedupeWarnings(step.warnings).map((w) => ({
      ...w,
      acknowledged: submission.dismissedWarnings[w.id] === true,
    })),
  }))

const dedupeWarnings = (warnings: readonly FlowWarning[]): FlowWarning[] => {
  const seen = new Set<string>()
  const result: FlowWarning[] = []
  for (const w of warnings) {
    if (seen.has(w.id)) continue
    seen.add(w.id)
    result.push(w)
  }

  return result
}

// ----- entry point -----

export const generateFlowCard = (submission: Submission): FlowCard => {
  if (submission.fileEntries.length === 0) {
    return { steps: [], globalWarnings: [] }
  }

  const globalWarnings: FlowWarning[] = []

  if (hasUnsetColumn(submission)) {
    globalWarnings.push({
      id: "global:unset-cells",
      severity: "warning",
      messageKey: "routes.submitAlt3.flowGen.global.unsetCells",
    })
  }

  // ---- Phase 1: context ----
  const { jga, bpSplit } = computeFlowGenContext(submission)

  // ---- Phase 2: Step 生成 (rule 別) ----
  const accumulated: FlowStep[] = []

  // Rule 6 (JGA + DBCLS)
  accumulated.push(...generateRule6Steps(submission, jga))

  // Rule 2 (Umbrella BP) — 先に id を確保
  const umbrellaStep = generateRule2Step(submission, bpSplit)
  if (umbrellaStep) accumulated.push(umbrellaStep)
  const umbrellaStepId = umbrellaStep?.id

  // Rule 1 (Primary BP) — Haplotype 以外
  accumulated.push(...generateRule1Steps(submission, bpSplit, umbrellaStepId))

  // Rule 3 (BS) — JGA / Haplotype 以外
  accumulated.push(...generateRule3Steps(submission, bpSplit, jga))

  // Rule 4 (DRA / MSS / GEA / MetaboBank / TogoVar / 外部 variation)
  accumulated.push(...generateRule4Steps(submission, bpSplit, jga))

  // Rule 7 (TPA / 第三者再解析)
  accumulated.push(...generateRule7Steps(submission, bpSplit, jga))

  // Rule 8 (MAG/SAG chain)
  accumulated.push(...generateRule8Steps(submission, bpSplit, jga))

  // Rule 9 (multiplex per-sample DRA Run)
  accumulated.push(...generateRule9Steps(submission, bpSplit, jga))

  // Rule 10 (phenotype 関連、現状空)
  accumulated.push(...generateRule10Steps(submission, jga))

  // Rule 11 (Haplotype phased)
  accumulated.push(...generateRule11Steps(submission, bpSplit, jga))

  // Rule 12 (外部 Service: humandbs)
  accumulated.push(...generateRule12Steps(submission, jga))

  // ---- Phase 3: 後処理 ----
  // Rule 13: MSS 自動推測値
  let processed = applyRule13Auxiliary(submission, accumulated)

  // Rule 14: 整合チェック warning
  processed = applyRule14Consistency(submission, processed)

  // Rule 15: Hybrid Assembly notes + access 不一致 globalWarning
  const rule15Result = evaluateRule15(submission, jga)
  processed = applyRule15Notes(processed, rule15Result)
  globalWarnings.push(...rule15Result.globalWarnings)

  // Service 単位 merge (docs/submit-alt3-flow-rules.md §8.1.A)
  processed = mergeStepsByMergeKey(processed)

  // 外部 Service Step の URL / linkLabel 補強
  processed = enrichExternalServiceSteps(processed)

  // descriptionKey / serviceUrl の補強 (docs/submit-alt3.md §6.1)
  processed = enrichStepsWithDescriptions(processed)

  // dismissedWarnings → acknowledged
  processed = applyDismissedWarnings(submission, processed)

  // 物理表示順序ソート
  const steps = sortStepsByPhysicalOrder(processed)

  return { steps, globalWarnings: dedupeWarnings(globalWarnings) }
}
