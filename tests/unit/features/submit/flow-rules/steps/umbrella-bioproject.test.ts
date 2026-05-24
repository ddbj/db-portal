import { describe, expect, test } from "vitest"

import {
  deriveFlowContext,
  umbrellaBioprojectStep,
} from "../../../../../../app/features/submit/flow-rules"
import { mkEntry, mkSubmission } from "../_helpers"

describe("umbrellaBioprojectStep", () => {
  test("umbrellaBioprojectStep_emptySubmission_yieldsEmpty", () => {
    const s = mkSubmission()
    expect(umbrellaBioprojectStep(s, deriveFlowContext(s))).toEqual([])
  })

  test("umbrellaBioprojectStep_singleOrganism_yieldsEmpty", () => {
    const s = mkSubmission({
      fileEntries: [mkEntry("e1", { organism: "human" })],
    })
    expect(umbrellaBioprojectStep(s, deriveFlowContext(s))).toEqual([])
  })

  test("umbrellaBioprojectStep_twoOrganisms_yieldsExactlyOne", () => {
    const s = mkSubmission({
      fileEntries: [
        mkEntry("e1", { organism: "human" }),
        mkEntry("e2", { organism: "eukaryote" }),
      ],
    })
    const steps = umbrellaBioprojectStep(s, deriveFlowContext(s))
    expect(steps).toHaveLength(1)
    expect(steps[0]!.service).toBe("umbrella-bioproject")
    expect(steps[0]!.scope.entryIds.sort()).toEqual(["e1", "e2"])
  })
})
