import { type FileEntry, type FlowStep, type Service, type Submission } from "~/schemas/submit"

import { type EntryRouting, routeEntries } from "./interpreter"
import { ENGINE_MESSAGE_KEYS as MK } from "./messages"
import { byServiceDependencyOrder } from "./ordering"
import { jgaSubmissionSteps, spatialSteps } from "./recipes"
import { makeStep, mergeScopes, scopeOfEntries } from "./shared"

// 薄インタプリタ: 同一 service の per-entry routing を 1 枚にまとめる
const buildTier1Steps = (routings: readonly EntryRouting[]): FlowStep[] => {
  const byService = new Map<Service, EntryRouting[]>()
  for (const r of routings) {
    const bucket = byService.get(r.service) ?? []
    bucket.push(r)
    byService.set(r.service, bucket)
  }

  return [...byService.entries()].map(([service, rs]) =>
    makeStep(`tier1-${service}`, service, "tier1", mergeScopes(rs.map((r) => r.scope)), rs.flatMap((r) => r.notes)),
  )
}

// 既定 companion: entry が 1 つでもあれば bioproject 1 + biosample 1 (jga entry は対象外)
const companionSteps = (entries: readonly FileEntry[]): FlowStep[] => {
  if (entries.length === 0) return []
  const scope = scopeOfEntries(entries)

  return [
    makeStep("tier2-bioproject", "bioproject", "tier2", scope, [
      { kind: "info", messageKey: MK.bioprojectIntro },
    ]),
    makeStep("tier2-biosample", "biosample", "tier2", scope, [
      { kind: "info", messageKey: MK.biosampleIntro },
    ]),
  ]
}

// 薄インタプリタ (Tier1) と Tier2 構造エンジン / named recipe を合成して FlowStep[] を返す (副作用なし)
export const deriveFlowSteps = (submission: Submission): FlowStep[] => {
  if (submission.fileEntries.length === 0) return []

  const routings = routeEntries(submission, submission.fileEntries)
  const jgaEntries = routings.filter((r) => r.service === "jga").map((r) => r.entry)
  const plainRoutings = routings.filter((r) => r.service !== "jga")

  const steps: FlowStep[] = [
    ...buildTier1Steps(plainRoutings),
    ...companionSteps(plainRoutings.map((r) => r.entry)),
    ...jgaSubmissionSteps(jgaEntries),
    ...spatialSteps(submission.fileEntries),
  ]

  return [...steps].sort(byServiceDependencyOrder)
}
