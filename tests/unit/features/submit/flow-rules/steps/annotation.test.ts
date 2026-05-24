import { describe, expect, test } from "vitest"

import {
  annotationStep,
  deriveFlowContext,
} from "../../../../../../app/features/submit/flow-rules"
import { mkEntry, mkGroup, mkSubmission } from "../_helpers"

describe("annotationStep", () => {
  test("annotationStep_noAnnotationEntries_yieldsEmpty", () => {
    const s = mkSubmission({
      fileEntries: [mkEntry("e1", { buttonType: "sequence-read" })],
    })
    expect(annotationStep(s, deriveFlowContext(s))).toEqual([])
  })

  test("annotationStep_geneAnnotationButtonType_yieldsStep", () => {
    const s = mkSubmission({
      fileEntries: [mkEntry("e1", { buttonType: "gene-annotation" })],
    })
    const steps = annotationStep(s, deriveFlowContext(s))
    expect(steps).toHaveLength(1)
    expect(steps[0]!.service).toBe("annotation")
  })

  test("annotationStep_assemblyAnnotationGroup_yieldsStep", () => {
    const s = mkSubmission({
      fileEntries: [
        mkEntry("e1", { buttonType: "assembled", groupId: "g1" }),
        mkEntry("e2", { buttonType: "gene-annotation", groupId: "g1" }),
      ],
      fileGroups: [mkGroup("g1", {
        groupType: "assembly-annotation",
        memberFileIds: ["e1", "e2"],
      })],
    })
    const steps = annotationStep(s, deriveFlowContext(s))
    expect(steps).toHaveLength(1)
    expect(steps[0]!.scope.entryIds.sort()).toEqual(["e1", "e2"])
  })
})
