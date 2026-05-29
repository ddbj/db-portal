import { describe, expect, test } from "vitest"

import { byServicePhysicalOrder } from "~/features/submit/flow-rules"
import type { FlowStep } from "~/schemas/submit"
import { SERVICE_PHYSICAL_ORDER } from "~/schemas/submit"

const mkStep = (over: Partial<FlowStep> & Pick<FlowStep, "service">): FlowStep => ({
  id: over.id ?? over.service,
  service: over.service,
  origin: over.origin ?? "tier1",
  scope: over.scope ?? { groupIds: [], entryIds: [] },
  notes: over.notes ?? [],
})

// byServicePhysicalOrder は service の物理順 → 同 service は id 昇順 (localeCompare)。
// 未知 service は末尾。これは値であって、ソート結果は安定な全順序になる。
describe("byServicePhysicalOrder", () => {
  test("byServicePhysicalOrder_shuffledOneStepPerService_sortsToPhysicalOrder", () => {
    const steps = SERVICE_PHYSICAL_ORDER.map((service, idx) =>
      mkStep({ id: `s${idx}`, service }),
    )
    // 物理順に逆らった入力 (逆順) から開始して順序が完全復元されることを見る
    const shuffled = [...steps].reverse()
    const sorted = [...shuffled].sort(byServicePhysicalOrder)
    expect(sorted.map((s) => s.service)).toEqual([...SERVICE_PHYSICAL_ORDER])
  })

  test("byServicePhysicalOrder_adjacentPairsRespectPhysicalRank", () => {
    // SERVICE_PHYSICAL_ORDER の隣接 2 service を逆順で渡すと、必ず物理順に並べ替わる
    for (let i = 0; i + 1 < SERVICE_PHYSICAL_ORDER.length; i += 1) {
      const earlier = SERVICE_PHYSICAL_ORDER[i]!
      const later = SERVICE_PHYSICAL_ORDER[i + 1]!
      const sorted = [
        mkStep({ id: "z", service: later }),
        mkStep({ id: "a", service: earlier }),
      ].sort(byServicePhysicalOrder)
      expect(sorted.map((s) => s.service)).toEqual([earlier, later])
    }
  })

  test("byServicePhysicalOrder_sameService_sortsByIdAscending", () => {
    const sorted = [
      mkStep({ id: "biosample:zebra", service: "biosample" }),
      mkStep({ id: "biosample:apple", service: "biosample" }),
      mkStep({ id: "biosample:mango", service: "biosample" }),
    ].sort(byServicePhysicalOrder)
    expect(sorted.map((s) => s.id)).toEqual([
      "biosample:apple",
      "biosample:mango",
      "biosample:zebra",
    ])
  })

  test("byServicePhysicalOrder_sameServiceIdCompare_isLexicographicNotNumeric", () => {
    // localeCompare は辞書順なので "10" < "2" になる (数値順ではない)
    const sorted = [
      mkStep({ id: "dra:2", service: "dra" }),
      mkStep({ id: "dra:10", service: "dra" }),
    ].sort(byServicePhysicalOrder)
    expect(sorted.map((s) => s.id)).toEqual(["dra:10", "dra:2"])
  })

  test("byServicePhysicalOrder_servicePrecedesIdTieBreak", () => {
    // service 順が id 順より優先される: 物理的に後ろの service は id が先頭でも後ろに来る
    const sorted = [
      mkStep({ id: "aaa", service: "metabobank" }),
      mkStep({ id: "zzz", service: "bioproject" }),
    ].sort(byServicePhysicalOrder)
    expect(sorted.map((s) => s.service)).toEqual(["bioproject", "metabobank"])
  })

  test("byServicePhysicalOrder_unknownService_sortsToEnd", () => {
    const sorted = [
      mkStep({ id: "x", service: "no-such-service" as FlowStep["service"] }),
      mkStep({ id: "dgva", service: "dgva" }),
      mkStep({ id: "bp", service: "bioproject" }),
    ].sort(byServicePhysicalOrder)
    expect(sorted.map((s) => s.service)).toEqual([
      "bioproject",
      "dgva",
      "no-such-service",
    ])
  })

  test("byServicePhysicalOrder_multipleUnknownServices_tieBreakByIdAtEnd", () => {
    // 未知 service 同士は同一 rank (末尾) なので id 昇順で安定する
    const sorted = [
      mkStep({ id: "u-zebra", service: "ghost" as FlowStep["service"] }),
      mkStep({ id: "u-apple", service: "phantom" as FlowStep["service"] }),
      mkStep({ id: "real", service: "togovar" }),
    ].sort(byServicePhysicalOrder)
    expect(sorted.map((s) => s.id)).toEqual(["real", "u-apple", "u-zebra"])
  })

  test("byServicePhysicalOrder_equalServiceAndId_returnsZero", () => {
    const a = mkStep({ id: "jga:1", service: "jga" })
    const b = mkStep({ id: "jga:1", service: "jga" })
    expect(byServicePhysicalOrder(a, b)).toBe(0)
  })

  test("byServicePhysicalOrder_isAntisymmetric_overServiceRank", () => {
    // service rank が異なる任意ペアで sign(cmp(a,b)) === -sign(cmp(b,a))
    for (let i = 0; i < SERVICE_PHYSICAL_ORDER.length; i += 1) {
      for (let j = 0; j < SERVICE_PHYSICAL_ORDER.length; j += 1) {
        if (i === j) continue
        const a = mkStep({ id: "k", service: SERVICE_PHYSICAL_ORDER[i]! })
        const b = mkStep({ id: "k", service: SERVICE_PHYSICAL_ORDER[j]! })
        const ab = byServicePhysicalOrder(a, b)
        const ba = byServicePhysicalOrder(b, a)
        expect(Math.sign(ab)).toBe(-Math.sign(ba))
        expect(ab).not.toBe(0)
      }
    }
  })

  test("byServicePhysicalOrder_idTieBreakWithinSameService_isAntisymmetric", () => {
    const a = mkStep({ id: "alpha", service: "gea" })
    const b = mkStep({ id: "beta", service: "gea" })
    expect(Math.sign(byServicePhysicalOrder(a, b))).toBe(
      -Math.sign(byServicePhysicalOrder(b, a)),
    )
  })

  test("byServicePhysicalOrder_emptyInput_staysEmpty", () => {
    const sorted = ([] as FlowStep[]).sort(byServicePhysicalOrder)
    expect(sorted).toEqual([])
  })

  test("byServicePhysicalOrder_originDoesNotAffectOrder", () => {
    // origin は並び替えキーに含まれない: 同 service・同 id なら origin 違いでも安定 (0)
    const a = mkStep({ id: "dra:1", service: "dra", origin: "tier1" })
    const b = mkStep({ id: "dra:1", service: "dra", origin: "recipe" })
    expect(byServicePhysicalOrder(a, b)).toBe(0)
  })
})
