import { describe, expect, test } from "vitest"

import {
  deriveFlowContext,
  variationStep,
} from "../../../../../../app/features/submit/flow-rules"
import { mkEntry, mkSubmission } from "../_helpers"

describe("variationStep", () => {
  test("variationStep_noVariationEntries_yieldsEmpty", () => {
    expect(variationStep(mkSubmission(), deriveFlowContext(mkSubmission()))).toEqual([])
  })

  test("variationStep_openVariation_yieldsInternalDdbjMass", () => {
    const s = mkSubmission({
      fileEntries: [mkEntry("e1", {
        buttonType: "variation",
        organism: "eukaryote",
        access: "open",
      })],
    })
    const steps = variationStep(s, deriveFlowContext(s))
    expect(steps).toHaveLength(1)
    expect(steps[0]!.service).toBe("ddbj-mass")
    expect(steps[0]!.id).toBe("ddbj-mass:variation")
  })

  test("variationStep_restrictedHumanVariation_yieldsEvaExternalStep", () => {
    const s = mkSubmission({
      fileEntries: [mkEntry("e1", {
        buttonType: "variation",
        organism: "human",
        access: "restricted",
      })],
    })
    const steps = variationStep(s, deriveFlowContext(s))
    expect(steps).toHaveLength(1)
    expect(steps[0]!.service).toBe("eva")
    expect(steps[0]!.notes.some((n) => n.kind === "warning")).toBe(true)
  })

  test("variationStep_openHumanVariation_yieldsInternalDdbjMass", () => {
    const s = mkSubmission({
      fileEntries: [mkEntry("e1", {
        buttonType: "variation",
        organism: "human",
        access: "open",
      })],
    })
    const steps = variationStep(s, deriveFlowContext(s))
    expect(steps).toHaveLength(1)
    expect(steps[0]!.service).toBe("ddbj-mass")
  })

  test("variationStep_restrictedNonHumanVariation_yieldsInternalDdbjMass", () => {
    const s = mkSubmission({
      fileEntries: [mkEntry("e1", {
        buttonType: "variation",
        organism: "eukaryote",
        access: "restricted",
      })],
    })
    const steps = variationStep(s, deriveFlowContext(s))
    expect(steps).toHaveLength(1)
    expect(steps[0]!.service).toBe("ddbj-mass")
  })

  test("variationStep_mixedInternalAndExternal_yieldsTwoSteps", () => {
    const s = mkSubmission({
      fileEntries: [
        mkEntry("e1", { buttonType: "variation", organism: "eukaryote", access: "open" }),
        mkEntry("e2", { buttonType: "variation", organism: "human", access: "restricted" }),
      ],
    })
    const steps = variationStep(s, deriveFlowContext(s))
    expect(steps).toHaveLength(2)
    const services = steps.map((st) => st.service)
    expect(services).toContain("ddbj-mass")
    expect(services).toContain("eva")
  })
})
