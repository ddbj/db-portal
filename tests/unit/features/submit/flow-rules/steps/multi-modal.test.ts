import { describe, expect, test } from "vitest"

import {
  deriveFlowContext,
  multiModalStep,
} from "../../../../../../app/features/submit/flow-rules"
import { mkEntry, mkGroup, mkSubmission } from "../_helpers"

describe("multiModalStep", () => {
  test("multiModalStep_singleButtonTypeGroup_yieldsEmpty", () => {
    const s = mkSubmission({
      fileEntries: [
        mkEntry("e1", { buttonType: "sequence-read", groupId: "g1" }),
        mkEntry("e2", { buttonType: "sequence-read", groupId: "g1" }),
      ],
      fileGroups: [mkGroup("g1", { groupType: "pair-end", memberFileIds: ["e1", "e2"] })],
    })
    expect(multiModalStep(s, deriveFlowContext(s))).toEqual([])
  })

  test("multiModalStep_twoButtonTypesInOneGroup_yieldsWarningStep", () => {
    const s = mkSubmission({
      fileEntries: [
        mkEntry("e1", { buttonType: "sequence-read", groupId: "g1" }),
        mkEntry("e2", { buttonType: "mass-spec", groupId: "g1" }),
      ],
      fileGroups: [mkGroup("g1", { groupType: "single", memberFileIds: ["e1", "e2"] })],
    })
    const steps = multiModalStep(s, deriveFlowContext(s))
    expect(steps).toHaveLength(1)
    expect(steps[0]!.notes.some((n) => n.kind === "warning")).toBe(true)
  })

  test("multiModalStep_assemblyAnnotationGroup_excludedFromMultiModal", () => {
    const s = mkSubmission({
      fileEntries: [
        mkEntry("e1", { buttonType: "assembled", groupId: "g1" }),
        mkEntry("e2", { buttonType: "gene-annotation", groupId: "g1" }),
      ],
      fileGroups: [mkGroup("g1", { groupType: "assembly-annotation", memberFileIds: ["e1", "e2"] })],
    })
    expect(multiModalStep(s, deriveFlowContext(s))).toEqual([])
  })
})
