import { describe, expect, test } from "vitest"

import {
  deriveFlowContext,
  draStep,
} from "../../../../../../app/features/submit/flow-rules"
import { mkEntry, mkSubmission } from "../_helpers"

describe("draStep", () => {
  test("draStep_noSequenceRead_yieldsEmpty", () => {
    const s = mkSubmission({
      fileEntries: [mkEntry("e1", { buttonType: "assembled" })],
    })
    expect(draStep(s, deriveFlowContext(s))).toEqual([])
  })

  test("draStep_openSequenceRead_yieldsOneStep", () => {
    const s = mkSubmission({
      fileEntries: [mkEntry("e1", {
        buttonType: "sequence-read",
        organism: "eukaryote",
        access: "open",
      })],
    })
    const steps = draStep(s, deriveFlowContext(s))
    expect(steps).toHaveLength(1)
    expect(steps[0]!.service).toBe("dra")
    expect(steps[0]!.scope.entryIds).toEqual(["e1"])
  })

  test("draStep_restrictedNonHumanRead_yieldsStep", () => {
    const s = mkSubmission({
      fileEntries: [mkEntry("e1", {
        buttonType: "sequence-read",
        organism: "prokaryote",
        access: "restricted",
      })],
    })
    expect(draStep(s, deriveFlowContext(s))).toHaveLength(1)
  })

  test("draStep_openHumanRead_yieldsStep", () => {
    const s = mkSubmission({
      fileEntries: [mkEntry("e1", {
        buttonType: "sequence-read",
        organism: "human",
        access: "open",
      })],
    })
    expect(draStep(s, deriveFlowContext(s))).toHaveLength(1)
  })

  test("draStep_restrictedHumanRead_yieldsEmpty", () => {
    const s = mkSubmission({
      fileEntries: [mkEntry("e1", {
        buttonType: "sequence-read",
        organism: "human",
        access: "restricted",
      })],
    })
    expect(draStep(s, deriveFlowContext(s))).toEqual([])
  })
})
