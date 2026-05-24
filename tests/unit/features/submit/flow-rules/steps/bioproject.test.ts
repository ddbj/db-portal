import { describe, expect, test } from "vitest"

import {
  bioprojectStep,
  deriveFlowContext,
} from "../../../../../../app/features/submit/flow-rules"
import { mkEntry, mkSubmission } from "../_helpers"

describe("bioprojectStep", () => {
  test("bioprojectStep_emptySubmission_yieldsEmpty", () => {
    const s = mkSubmission()
    expect(bioprojectStep(s, deriveFlowContext(s))).toEqual([])
  })

  test("bioprojectStep_singleOrganism_yieldsOnePrimary", () => {
    const s = mkSubmission({
      fileEntries: [mkEntry("e1", { organism: "eukaryote" })],
    })
    const steps = bioprojectStep(s, deriveFlowContext(s))
    expect(steps).toHaveLength(1)
    expect(steps[0]!.service).toBe("bioproject")
    expect(steps[0]!.id).toBe("bioproject:eukaryote")
  })

  test("bioprojectStep_threeOrganisms_yieldsThreePrimaries", () => {
    const s = mkSubmission({
      fileEntries: [
        mkEntry("e1", { organism: "human" }),
        mkEntry("e2", { organism: "prokaryote" }),
        mkEntry("e3", { organism: "virus" }),
      ],
    })
    const steps = bioprojectStep(s, deriveFlowContext(s))
    expect(steps).toHaveLength(3)
    expect(new Set(steps.map((st) => st.id))).toEqual(new Set([
      "bioproject:human",
      "bioproject:prokaryote",
      "bioproject:virus",
    ]))
  })
})
