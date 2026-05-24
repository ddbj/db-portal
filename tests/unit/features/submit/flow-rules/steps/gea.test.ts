import { describe, expect, test } from "vitest"

import {
  deriveFlowContext,
  geaStep,
} from "../../../../../../app/features/submit/flow-rules"
import { mkEntry, mkGroup, mkSubmission } from "../_helpers"

describe("geaStep", () => {
  test("geaStep_noExpressionEntries_yieldsEmpty", () => {
    expect(geaStep(mkSubmission(), deriveFlowContext(mkSubmission()))).toEqual([])
  })

  test("geaStep_microarrayExpressionButton_yieldsStep", () => {
    const s = mkSubmission({
      fileEntries: [mkEntry("e1", { buttonType: "microarray-expression" })],
    })
    expect(geaStep(s, deriveFlowContext(s))).toHaveLength(1)
  })

  test("geaStep_mageTabGroup_pullsAllGroupMembers", () => {
    const s = mkSubmission({
      fileEntries: [
        mkEntry("e1", { buttonType: "sequence-read", groupId: "g1" }),
        mkEntry("e2", { buttonType: "rna-seq-matrix", groupId: "g1" }),
      ],
      fileGroups: [mkGroup("g1", { groupType: "mage-tab", memberFileIds: ["e1", "e2"] })],
    })
    const steps = geaStep(s, deriveFlowContext(s))
    expect(steps).toHaveLength(1)
    expect(steps[0]!.scope.entryIds.sort()).toEqual(["e1", "e2"])
  })
})
