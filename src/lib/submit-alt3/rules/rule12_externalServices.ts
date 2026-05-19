// Rule 12: 外部 Service Step (info-only)
// SSOT: docs/submit-alt3-flow-rules.md §8.1 Rule 12
//
// dbcls-application: rule06 で JGA 集約時に生成済み
// humandbs: JGA 集約発火時に「公開後の hum 番号閲覧先」を案内する Step を追加
// jpost / eva / dgva: rule04 / rule07 で variation / mass-spec の振り分け時に生成済み
//
// 本 rule では humandbs Step の追加と、各外部 Service Step の URL / note を補強。

import { EXTERNAL_SERVICE_URLS } from "@/lib/mock-data/submit-alt3"
import type {
  FlowStep,
  Submission,
} from "@/types/submit-alt3"

import type { JgaContext } from "./context"
import {
  createStep,
  mergeServiceDraft,
} from "./shared"

export const generateRule12Steps = (
  submission: Submission,
  jga: JgaContext,
): FlowStep[] => {
  const steps: FlowStep[] = []

  // JGA 集約発火時に humandbs (公開後参照) Step を追加
  if (jga.enabled) {
    const humandbsConfig = EXTERNAL_SERVICE_URLS["humandbs"]
    steps.push(
      createStep({
        service: "humandbs",
        targetGroupIds: Array.from(jga.jgaGroupIds),
        targetFileIds: Array.from(jga.jgaFileIds),
        intraDbInputs: mergeServiceDraft(submission, "step-humandbs", {
          url: humandbsConfig?.url,
        }),
        upstreamStepIds: ["step-jga"],
        notes: [
          "routes.submitAlt3.flowGen.rule12.humandbs.notes",
          ...(humandbsConfig?.url ? [humandbsConfig.url] : []),
        ],
      }),
    )
  }

  return steps
}

// 既に他 rule で生成された外部 Service Step (jpost / eva / dgva) に URL / notes を補強する後処理
export const enrichExternalServiceSteps = (steps: FlowStep[]): FlowStep[] =>
  steps.map((step) => {
    if (step.badgeKind !== "external") return step
    const cfg = EXTERNAL_SERVICE_URLS[step.service]
    if (!cfg) return step

    const hasUrlNote = step.notes.some((n) => n === cfg.url)

    return {
      ...step,
      intraDbInputs: {
        ...step.intraDbInputs,
        url: step.intraDbInputs.url ?? cfg.url,
        linkLabel: cfg.labelKey,
      },
      notes: hasUrlNote ? step.notes : [...step.notes, cfg.url],
    }
  })
