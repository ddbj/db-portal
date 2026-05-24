import { describe, expect, test } from "vitest"

import {
  deriveFlowContext,
  thirdPartyStep,
} from "../../../../../../app/features/submit/flow-rules"
import { mkEntry, mkSubmission } from "../_helpers"

describe("thirdPartyStep", () => {
  test("thirdPartyStep_noTpaIndicators_yieldsEmpty", () => {
    expect(thirdPartyStep(mkSubmission(), deriveFlowContext(mkSubmission()))).toEqual([])
  })

  test("thirdPartyStep_provenanceThirdPartyChip_yieldsStep", () => {
    const s = mkSubmission({
      fileEntries: [mkEntry("e1", {
        chipTags: [{ axis: "provenance", value: "third-party" }],
      })],
    })
    const steps = thirdPartyStep(s, deriveFlowContext(s))
    expect(steps).toHaveLength(1)
    expect(steps[0]!.id).toBe("ddbj-mass:tpa")
    expect(steps[0]!.service).toBe("ddbj-mass")
  })

  test("thirdPartyStep_tpaSubtypeChip_yieldsStep", () => {
    const s = mkSubmission({
      fileEntries: [mkEntry("e1", {
        chipTags: [{ axis: "tpa-subtype", value: "tpa" }],
      })],
    })
    expect(thirdPartyStep(s, deriveFlowContext(s))).toHaveLength(1)
  })
})
