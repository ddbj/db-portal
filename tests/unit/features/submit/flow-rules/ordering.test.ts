import { describe, expect, test } from "vitest"

import { byServicePhysicalOrder } from "../../../../../app/features/submit/flow-rules"
import { mkStep } from "./_helpers"

describe("byServicePhysicalOrder", () => {
  test("byServicePhysicalOrder_umbrellaBeforeBioproject", () => {
    const ordered = [
      mkStep({ id: "bp", service: "bioproject" }),
      mkStep({ id: "um", service: "umbrella-bioproject" }),
    ].sort(byServicePhysicalOrder)
    expect(ordered.map((s) => s.service)).toEqual(["umbrella-bioproject", "bioproject"])
  })

  test("byServicePhysicalOrder_internalBeforeExternal", () => {
    const ordered = [
      mkStep({ id: "e", service: "eva" }),
      mkStep({ id: "ddbj-mass", service: "ddbj-mass" }),
    ].sort(byServicePhysicalOrder)
    expect(ordered.map((s) => s.service)).toEqual(["ddbj-mass", "eva"])
  })

  test("byServicePhysicalOrder_sameServiceUsesIdLexCompare", () => {
    const ordered = [
      mkStep({ id: "b", service: "biosample" }),
      mkStep({ id: "a", service: "biosample" }),
    ].sort(byServicePhysicalOrder)
    expect(ordered.map((s) => s.id)).toEqual(["a", "b"])
  })
})
