import { describe, expect, test } from "vitest"

import {
  deriveFlowContext,
  metabobankStep,
} from "../../../../../../app/features/submit/flow-rules"
import { mkEntry, mkGroup, mkSubmission } from "../_helpers"

describe("metabobankStep", () => {
  test("metabobankStep_noMassSpec_yieldsEmpty", () => {
    expect(metabobankStep(mkSubmission(), deriveFlowContext(mkSubmission()))).toEqual([])
  })

  test("metabobankStep_massSpecEntry_yieldsStepWithoutJpostWarning", () => {
    const s = mkSubmission({
      fileEntries: [mkEntry("e1", { buttonType: "mass-spec", dataForm: "mass-spec" })],
    })
    const steps = metabobankStep(s, deriveFlowContext(s))
    expect(steps).toHaveLength(1)
    expect(steps[0]!.notes.some((n) => n.kind === "warning")).toBe(false)
  })

  test("metabobankStep_proteomicsChip_addsJpostWarning", () => {
    const s = mkSubmission({
      fileEntries: [mkEntry("e1", {
        buttonType: "mass-spec",
        dataForm: "mass-spec",
        chipTags: [{ axis: "mass-spec-domain", value: "proteomics" }],
      })],
    })
    const steps = metabobankStep(s, deriveFlowContext(s))
    expect(steps[0]!.notes.some((n) => n.kind === "warning")).toBe(true)
  })

  test("metabobankStep_metabolomicsChip_noWarning", () => {
    const s = mkSubmission({
      fileEntries: [mkEntry("e1", {
        buttonType: "mass-spec",
        dataForm: "mass-spec",
        chipTags: [{ axis: "mass-spec-domain", value: "metabolomics" }],
      })],
    })
    const steps = metabobankStep(s, deriveFlowContext(s))
    expect(steps[0]!.notes.some((n) => n.kind === "warning")).toBe(false)
  })

  test("metabobankStep_imagingMsGroup_pullsEntries", () => {
    const s = mkSubmission({
      fileEntries: [mkEntry("e1", {
        buttonType: "spatial-tx",
        dataForm: "matrix",
        groupId: "g1",
      })],
      fileGroups: [mkGroup("g1", { groupType: "imaging-ms", memberFileIds: ["e1"] })],
    })
    expect(metabobankStep(s, deriveFlowContext(s))).toHaveLength(1)
  })
})
