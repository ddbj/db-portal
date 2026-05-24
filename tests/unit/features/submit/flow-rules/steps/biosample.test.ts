import { describe, expect, test } from "vitest"

import {
  biosampleStep,
  deriveFlowContext,
} from "../../../../../../app/features/submit/flow-rules"
import { mkEntry, mkSubmission } from "../_helpers"

describe("biosampleStep", () => {
  test("biosampleStep_emptySubmission_yieldsEmpty", () => {
    const s = mkSubmission()
    expect(biosampleStep(s, deriveFlowContext(s))).toEqual([])
  })

  test("biosampleStep_singleOrganism_yieldsOneStep", () => {
    const s = mkSubmission({
      fileEntries: [mkEntry("e1", { organism: "human", access: "restricted" })],
    })
    const steps = biosampleStep(s, deriveFlowContext(s))
    expect(steps).toHaveLength(1)
    expect(steps[0]!.service).toBe("biosample")
    expect(steps[0]!.scope.entryIds).toEqual(["e1"])
  })

  test("biosampleStep_twoOrganisms_yieldsTwoSteps", () => {
    const s = mkSubmission({
      fileEntries: [
        mkEntry("e1", { organism: "human" }),
        mkEntry("e2", { organism: "eukaryote" }),
      ],
    })
    const steps = biosampleStep(s, deriveFlowContext(s))
    expect(steps).toHaveLength(2)
    expect(new Set(steps.map((st) => st.id))).toEqual(new Set([
      "biosample:human",
      "biosample:eukaryote",
    ]))
  })
})
