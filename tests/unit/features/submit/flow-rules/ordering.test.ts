import { describe, expect, test } from "vitest"

import { byServicePhysicalOrder } from "../../../../../app/features/submit/flow-rules"
import type { FlowStep } from "../../../../../app/schemas/submit"

const mkStep = (id: string, service: FlowStep["service"]): FlowStep => ({
  id,
  service,
  scope: { groupIds: [], entryIds: ["e"] },
  notes: [],
})

describe("byServicePhysicalOrder", () => {
  test("byServicePhysicalOrder_umbrellaBeforeBioproject", () => {
    const ordered = [mkStep("bp", "bioproject"), mkStep("um", "umbrella-bioproject")]
      .sort(byServicePhysicalOrder)
    expect(ordered.map((s) => s.service)).toEqual(["umbrella-bioproject", "bioproject"])
  })

  test("byServicePhysicalOrder_internalBeforeExternal", () => {
    const ordered = [
      mkStep("e", "eva"),
      mkStep("ddbj-mass", "ddbj-mass"),
    ].sort(byServicePhysicalOrder)
    expect(ordered.map((s) => s.service)).toEqual(["ddbj-mass", "eva"])
  })

  test("byServicePhysicalOrder_sameServiceUsesIdLexCompare", () => {
    const ordered = [
      mkStep("b", "biosample"),
      mkStep("a", "biosample"),
    ].sort(byServicePhysicalOrder)
    expect(ordered.map((s) => s.id)).toEqual(["a", "b"])
  })
})
