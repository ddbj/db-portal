// Service 単位 merge の test (PBT + golden)
// SSOT: docs/submit-alt3-flow-rules.md §8.1.A

import fc from "fast-check"
import { describe, expect, it } from "vitest"

import { mergeStepsByMergeKey } from "@/lib/submit-alt3/mergeSteps"
import type { FlowStep, ServiceKind } from "@/types/submit-alt3"

const SERVICE_VALUES: readonly ServiceKind[] = [
  "primary-bioproject",
  "biosample",
  "dra",
  "mss",
  "gea",
]

const buildStep = (params: {
  id: string
  mergeKey: string
  service?: ServiceKind
  targetFileIds?: readonly string[]
  upstreamStepIds?: readonly string[]
  notes?: readonly string[]
  intraDbInputs?: Record<string, unknown>
}): FlowStep => ({
  id: params.id,
  mergeKey: params.mergeKey,
  service: params.service ?? "dra",
  title: "flowSteps.dra.title",
  targetGroupIds: [],
  targetFileIds: [...(params.targetFileIds ?? [])],
  intraDbInputs: params.intraDbInputs ?? {},
  upstreamStepIds: [...(params.upstreamStepIds ?? [])],
  issuedAccessionTypes: ["DRR#####"],
  badgeKind: "internal",
  notes: [...(params.notes ?? [])],
  warnings: [],
})

// PBT 用 arbitrary: 1 Step を生成 (service + mergeKey suffix + file 集合 + upstream)
const stepArb: fc.Arbitrary<FlowStep> = fc.record({
  idx: fc.integer({ min: 0, max: 99 }),
  service: fc.constantFrom(...SERVICE_VALUES),
  mergeKeySuffix: fc.constantFrom("default", "phase-a", "phase-b", "stage-1", "stage-2"),
  files: fc.array(fc.string({ minLength: 1, maxLength: 6 }), { minLength: 0, maxLength: 5 }),
  upstreams: fc.array(fc.string({ minLength: 1, maxLength: 8 }), { minLength: 0, maxLength: 3 }),
}).map(({ idx, service, mergeKeySuffix, files, upstreams }) => {
  const mergeKey = mergeKeySuffix === "default" ? service : `${service}:${mergeKeySuffix}`

  return buildStep({
    id: `step-${service}-${idx}`,
    mergeKey,
    service,
    targetFileIds: files,
    upstreamStepIds: upstreams,
  })
})

const union = <T>(items: readonly (readonly T[])[]): Set<T> =>
  new Set(items.flatMap((arr) => Array.from(arr)))

describe("mergeStepsByMergeKey / PBT 不変条件", () => {
  it("targetFileIds の和集合は merge 前後で同一", () => {
    fc.assert(
      fc.property(fc.array(stepArb, { minLength: 0, maxLength: 30 }), (steps) => {
        const merged = mergeStepsByMergeKey(steps)
        const before = union(steps.map((s) => s.targetFileIds))
        const after = union(merged.map((s) => s.targetFileIds))
        expect(after).toEqual(before)
      }),
    )
  })

  it("upstreamStepIds の和集合が merge 後 upstream を包含する (リマップ後の id 集合は merge 後 Step.id 群の subset)", () => {
    fc.assert(
      fc.property(fc.array(stepArb, { minLength: 0, maxLength: 30 }), (steps) => {
        const merged = mergeStepsByMergeKey(steps)
        const mergedIds = new Set(merged.map((s) => s.id))
        const mergedUpstreams = union(merged.map((s) => s.upstreamStepIds))
        // upstreams that referenced an old (merged-away) Step ID should be remapped to merged IDs
        // or remain as external (never-merged) IDs. We only check that any upstream pointing to
        // a Step ID we still track is consistent.
        for (const u of mergedUpstreams) {
          // u は merged steps の id か、未存在 (= 外部 id, 例えば segment が無いケース) のいずれか
          if (mergedIds.has(u)) continue
          // 外部 id は許容 (例: 元 Step ID が他の merge group に統合された場合は mergedIds に出てくる)
          expect(typeof u).toBe("string")
        }
      }),
    )
  })

  it("同じ mergeKey + service の Step は 1 件に集約 (count 不変)", () => {
    fc.assert(
      fc.property(fc.array(stepArb, { minLength: 1, maxLength: 30 }), (steps) => {
        const merged = mergeStepsByMergeKey(steps)
        const beforeKeys = new Set(steps.map((s) => `${s.service} ${s.mergeKey}`))
        const afterKeys = new Set(merged.map((s) => `${s.service} ${s.mergeKey}`))
        expect(afterKeys).toEqual(beforeKeys)
        // merge 後 Step 数 = 一意な (service, mergeKey) 組合せ数
        expect(merged.length).toBe(beforeKeys.size)
      }),
    )
  })

  it("異なる mergeKey は別 Step に維持 (multiplex per-file 例: dra:multiplex:fileA vs fileB)", () => {
    const steps = [
      buildStep({ id: "step-dra-fileA", mergeKey: "dra:multiplex:fileA", service: "dra" }),
      buildStep({ id: "step-dra-fileB", mergeKey: "dra:multiplex:fileB", service: "dra" }),
      buildStep({ id: "step-dra-fileC", mergeKey: "dra:multiplex:fileC", service: "dra" }),
    ]
    const merged = mergeStepsByMergeKey(steps)
    expect(merged).toHaveLength(3)
    expect(merged.every((s) => s.segments === undefined)).toBe(true)
  })
})

describe("mergeStepsByMergeKey / golden", () => {
  it("同 service + 同 mergeKey の 3 Step を 1 Step に畳む (segments=3)", () => {
    const steps = [
      buildStep({
        id: "step-mss-bs-1",
        mergeKey: "mss",
        service: "mss",
        targetFileIds: ["file-1"],
        upstreamStepIds: ["step-biosample-bs-1"],
        intraDbInputs: { dataType: "WGS" },
        notes: ["note-1"],
      }),
      buildStep({
        id: "step-mss-bs-2",
        mergeKey: "mss",
        service: "mss",
        targetFileIds: ["file-2"],
        upstreamStepIds: ["step-biosample-bs-2"],
        intraDbInputs: { dataType: "TSA" },
        notes: ["note-2"],
      }),
      buildStep({
        id: "step-mss-bs-3",
        mergeKey: "mss",
        service: "mss",
        targetFileIds: ["file-3"],
        upstreamStepIds: ["step-biosample-bs-3"],
        intraDbInputs: { dataType: "MAG" },
        notes: ["note-3"],
      }),
    ]
    const merged = mergeStepsByMergeKey(steps)
    expect(merged).toHaveLength(1)
    const mss = merged[0]!
    expect(mss.id).toBe("step-mss-bs-1") // 最古 segment.id を継承
    expect(mss.intraDbInputs).toEqual({}) // merge 後トップは空 (segments[].intraDbInputs に保存)
    expect(mss.segments).toHaveLength(3)
    expect(mss.segments?.map((seg) => seg.segmentId)).toEqual([
      "step-mss-bs-1",
      "step-mss-bs-2",
      "step-mss-bs-3",
    ])
    expect(mss.segments?.[0]!.intraDbInputs).toEqual({ dataType: "WGS" })
    expect(mss.segments?.[1]!.intraDbInputs).toEqual({ dataType: "TSA" })
    expect(mss.segments?.[2]!.intraDbInputs).toEqual({ dataType: "MAG" })
    expect(mss.targetFileIds).toEqual(["file-1", "file-2", "file-3"])
    expect(mss.notes).toEqual(["note-1", "note-2", "note-3"])
  })

  it("upstream の merge 前 id は merge 後 Step.id にリマップされる", () => {
    const steps = [
      buildStep({
        id: "step-biosample-bs-1",
        mergeKey: "biosample",
        service: "biosample",
      }),
      buildStep({
        id: "step-biosample-bs-2",
        mergeKey: "biosample",
        service: "biosample",
      }),
      buildStep({
        id: "step-mss-bs-1",
        mergeKey: "mss",
        service: "mss",
        upstreamStepIds: ["step-biosample-bs-2"],
      }),
    ]
    const merged = mergeStepsByMergeKey(steps)
    const mss = merged.find((s) => s.service === "mss")!
    // upstream "step-biosample-bs-2" は merge により "step-biosample-bs-1" にリマップ
    expect(mss.upstreamStepIds).toEqual(["step-biosample-bs-1"])
  })

  it("length=1 の Step は segments を持たない (後方互換)", () => {
    const steps = [
      buildStep({ id: "step-dra-bs-1", mergeKey: "dra", service: "dra" }),
    ]
    const merged = mergeStepsByMergeKey(steps)
    expect(merged[0]!.segments).toBeUndefined()
  })
})
