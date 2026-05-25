import { describe, expect, test } from "vitest"

import {
  deriveFlowContext,
  draStep,
} from "../../../../../../app/features/submit/flow-rules"
import type { Access, Organism } from "../../../../../../app/schemas/submit"
import { mkEntry, mkSubmission } from "../_helpers"

describe("draStep", () => {
  test("draStep_noSequenceRead_yieldsEmpty", () => {
    const s = mkSubmission({
      fileEntries: [mkEntry("e1", { buttonType: "assembled" })],
    })
    expect(draStep(s, deriveFlowContext(s))).toEqual([])
  })

  test.each<[name: string, organism: Organism, access: Access]>([
    ["openEukaryote", "eukaryote", "open"],
    ["restrictedProkaryote", "prokaryote", "restricted"],
    ["openHuman", "human", "open"],
  ])(
    "draStep_%s_yieldsOneStepWithEntry",
    (_name, organism, access) => {
      const s = mkSubmission({
        fileEntries: [mkEntry("e1", { buttonType: "sequence-read", organism, access })],
      })
      const steps = draStep(s, deriveFlowContext(s))
      expect(steps).toHaveLength(1)
      expect(steps[0]!.service).toBe("dra")
      expect(steps[0]!.scope.entryIds).toEqual(["e1"])
    },
  )

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
