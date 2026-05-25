import { describe, expect, test } from "vitest"

import {
  deriveFlowContext,
  jgaStep,
} from "../../../../../../app/features/submit/flow-rules"
import type { Access, Organism } from "../../../../../../app/schemas/submit"
import { mkEntry, mkSubmission } from "../_helpers"

describe("jgaStep", () => {
  test.each<[name: string, organism: Organism, access: Access, expectedLength: number]>([
    ["openHuman", "human", "open", 0],
    ["restrictedHuman", "human", "restricted", 1],
    ["restrictedEukaryote", "eukaryote", "restricted", 0],
    ["openEukaryote", "eukaryote", "open", 0],
  ])(
    "jgaStep_%s_yieldsExpectedStepCount",
    (_name, organism, access, expectedLength) => {
      const s = mkSubmission({
        fileEntries: [mkEntry("e1", { buttonType: "sequence-read", organism, access })],
      })
      expect(jgaStep(s, deriveFlowContext(s))).toHaveLength(expectedLength)
    },
  )

  test("jgaStep_restrictedHumanRead_includesDbclsApplicationNote", () => {
    const s = mkSubmission({
      fileEntries: [mkEntry("e1", {
        buttonType: "sequence-read",
        organism: "human",
        access: "restricted",
      })],
    })
    const steps = jgaStep(s, deriveFlowContext(s))
    expect(steps[0]!.service).toBe("jga")
    expect(steps[0]!.notes.some((n) => n.messageKey.includes("dbcls"))).toBe(true)
  })
})
