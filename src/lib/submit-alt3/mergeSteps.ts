// Service 単位 merge (Phase 3 後処理)
// SSOT: docs/submit-alt3-flow-rules.md §8.1.A
//
// 同一 ServiceKind + 同一 mergeKey の Step を 1 枚に集約する。
// merge 前 Step は FlowStepSegment として配下に保持され、warning ID stability
// (segmentId) と serviceDrafts[] のキー互換性が確保される。

import type { FlowStep, FlowStepSegment, FlowWarning } from "@/types/submit-alt3"

const dedupeBy = <T, K>(items: readonly T[], keyFn: (item: T) => K): T[] => {
  const seen = new Set<K>()
  const result: T[] = []
  for (const item of items) {
    const key = keyFn(item)
    if (seen.has(key)) continue
    seen.add(key)
    result.push(item)
  }

  return result
}

const dedupe = <T>(items: readonly T[]): T[] => dedupeBy(items, (x) => x)

const toSegment = (step: FlowStep): FlowStepSegment => ({
  segmentId: step.id,
  targetGroupIds: [...step.targetGroupIds],
  targetFileIds: [...step.targetFileIds],
  upstreamStepIds: [...step.upstreamStepIds],
  intraDbInputs: step.intraDbInputs,
  notes: [...step.notes],
})

export const mergeStepsByMergeKey = (
  steps: readonly FlowStep[],
): FlowStep[] => {
  const groups = new Map<string, FlowStep[]>()
  const orderedKeys: string[] = []

  for (const step of steps) {
    const key = `${step.service} ${step.mergeKey}`
    let bucket = groups.get(key)
    if (bucket === undefined) {
      bucket = []
      groups.set(key, bucket)
      orderedKeys.push(key)
    }
    bucket.push(step)
  }

  // segment.id → merge 後 Step.id のリマップ。upstream 参照を畳んだ後の Step ID に書き換えるため。
  const idRemap = new Map<string, string>()
  for (const key of orderedKeys) {
    const group = groups.get(key) ?? []
    const base = group[0]
    if (base === undefined) continue
    for (const s of group) {
      idRemap.set(s.id, base.id)
    }
  }

  const remapId = (id: string): string => idRemap.get(id) ?? id

  const merged: FlowStep[] = []
  for (const key of orderedKeys) {
    const group = groups.get(key) ?? []
    const base = group[0]
    if (base === undefined) continue
    if (group.length === 1) {
      merged.push({
        ...base,
        upstreamStepIds: dedupe(base.upstreamStepIds.map(remapId)),
      })
      continue
    }

    const segments: FlowStepSegment[] = group.map((s) => ({
      ...toSegment(s),
      upstreamStepIds: dedupe(s.upstreamStepIds.map(remapId)),
    }))

    merged.push({
      ...base,
      targetGroupIds: dedupe(group.flatMap((g) => g.targetGroupIds)),
      targetFileIds: dedupe(group.flatMap((g) => g.targetFileIds)),
      upstreamStepIds: dedupe(group.flatMap((g) => g.upstreamStepIds.map(remapId))),
      issuedAccessionTypes: base.issuedAccessionTypes,
      notes: dedupe(group.flatMap((g) => g.notes)),
      warnings: dedupeBy(
        group.flatMap((g) => g.warnings),
        (w: FlowWarning) => w.id,
      ),
      intraDbInputs: {},
      segments,
    })
  }

  return merged
}
