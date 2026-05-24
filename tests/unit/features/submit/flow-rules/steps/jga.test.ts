import { describe, expect, test } from "vitest"

import {
  deriveFlowContext,
  jgaStep,
} from "../../../../../../app/features/submit/flow-rules"
import { mkEntry, mkSubmission } from "../_helpers"

describe("jgaStep", () => {
  test("jgaStep_openHumanRead_yieldsEmpty", () => {
    const s = mkSubmission({
      fileEntries: [mkEntry("e1", { organism: "human", access: "open" })],
    })
    expect(jgaStep(s, deriveFlowContext(s))).toEqual([])
  })

  test("jgaStep_restrictedHumanRead_yieldsOneStep", () => {
    const s = mkSubmission({
      fileEntries: [mkEntry("e1", {
        buttonType: "sequence-read",
        organism: "human",
        access: "restricted",
      })],
    })
    const steps = jgaStep(s, deriveFlowContext(s))
    expect(steps).toHaveLength(1)
    expect(steps[0]!.service).toBe("jga")
    expect(steps[0]!.notes.some((n) => n.messageKey.includes("dbcls"))).toBe(true)
  })

  test("jgaStep_restrictedEukaryoteRead_yieldsEmpty", () => {
    const s = mkSubmission({
      fileEntries: [mkEntry("e1", {
        organism: "eukaryote",
        access: "restricted",
      })],
    })
    expect(jgaStep(s, deriveFlowContext(s))).toEqual([])
  })
})
