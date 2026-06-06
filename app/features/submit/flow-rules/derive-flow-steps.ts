import { type FileEntry, type FlowStep, type Service, type Submission } from "~/schemas/submit"

import { isKindEnabled } from "../cascade"
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

// 同一 service の step を 1 枚に union する (scope を結合し note をまとめる)。
// Tier1 の DRA と spatial recipe の DRA のように、別ソースが同じ service を emit したとき
// 右 pane に同 service のカードが 2 枚出るのを防ぐ (最初に現れた step の id / origin を保つ)。
const mergeSameServiceSteps = (steps: readonly FlowStep[]): FlowStep[] => {
  const byService = new Map<Service, FlowStep>()
  for (const step of steps) {
    const existing = byService.get(step.service)
    if (existing === undefined) {
      byService.set(step.service, step)
      continue
    }
    byService.set(step.service, makeStep(
      existing.id,
      existing.service,
      existing.origin,
      mergeScopes([existing.scope, step.scope]),
      [...existing.notes, ...step.notes],
    ))
  }

  return [...byService.values()]
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
  const { q1, q2 } = submission.preconditions
  // 前段カスケードで disable された種別は登録先を持たないため flow から除く
  // (右 pane に無効な登録先を出さず、precondition-conflict と表示を一致させる)
  const activeEntries = submission.fileEntries.filter((e) => isKindEnabled(q1, q2, e.fileTypeKind))
  if (activeEntries.length === 0) return []

  const routings = routeEntries(submission, activeEntries)
  const jgaEntries = routings.filter((r) => r.service === "jga").map((r) => r.entry)
  const plainRoutings = routings.filter((r) => r.service !== "jga")

  const steps = mergeSameServiceSteps([
    ...buildTier1Steps(plainRoutings),
    ...companionSteps(plainRoutings.map((r) => r.entry)),
    ...jgaSubmissionSteps(jgaEntries),
    ...spatialSteps(activeEntries),
  ])

  return [...steps].sort(byServiceDependencyOrder)
}
