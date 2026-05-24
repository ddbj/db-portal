import { describe, expect, test } from "vitest"

import { deriveFlowSteps } from "../../../../../app/features/submit/flow-rules"
import { mkEntry, mkGroup, mkSubmission } from "./_helpers"

describe("deriveFlowSteps integration", () => {
  test("deriveFlowSteps_emptySubmission_yieldsEmpty", () => {
    expect(deriveFlowSteps(mkSubmission())).toEqual([])
  })

  test("deriveFlowSteps_openSequenceReadEukaryote_yieldsDraBsBp", () => {
    const steps = deriveFlowSteps(mkSubmission({
      fileEntries: [mkEntry("e1", { organism: "eukaryote", access: "open" })],
      fileGroups: [mkGroup("e1-g", { groupType: "single", memberFileIds: ["e1"] })],
    }))
    const services = steps.map((s) => s.service)
    expect(services).toContain("dra")
    expect(services).toContain("biosample")
    expect(services).toContain("bioproject")
    expect(services).not.toContain("jga")
    expect(services).not.toContain("umbrella-bioproject")
  })

  test("deriveFlowSteps_restrictedHumanRead_yieldsJgaBsBp", () => {
    const steps = deriveFlowSteps(mkSubmission({
      fileEntries: [mkEntry("e1", { organism: "human", access: "restricted" })],
      fileGroups: [mkGroup("e1-g", { groupType: "jga-dataset", memberFileIds: ["e1"] })],
    }))
    const services = steps.map((s) => s.service)
    expect(services).toContain("jga")
    expect(services).not.toContain("dra")
  })

  test("deriveFlowSteps_twoOrganisms_yieldsUmbrella", () => {
    const steps = deriveFlowSteps(mkSubmission({
      fileEntries: [
        mkEntry("e1", { organism: "eukaryote", access: "open" }),
        mkEntry("e2", { organism: "prokaryote", access: "open" }),
      ],
      fileGroups: [
        mkGroup("e1-g", { groupType: "single", memberFileIds: ["e1"] }),
        mkGroup("e2-g", { groupType: "single", memberFileIds: ["e2"] }),
      ],
    }))
    const services = steps.map((s) => s.service)
    expect(services.filter((s) => s === "bioproject")).toHaveLength(2)
    expect(services).toContain("umbrella-bioproject")
  })

  test("deriveFlowSteps_twoOrganismsOpen_bioprojectIdsUsePrefixBioproject", () => {
    const steps = deriveFlowSteps(mkSubmission({
      fileEntries: [
        mkEntry("e1", { organism: "eukaryote", access: "open" }),
        mkEntry("e2", { organism: "prokaryote", access: "open" }),
      ],
    }))
    const ids = steps.filter((s) => s.service === "bioproject").map((s) => s.id)
    expect(ids.sort()).toEqual(["bioproject:eukaryote", "bioproject:prokaryote"])
  })

  test("deriveFlowSteps_orderingHasUmbrellaFirst_thenBioprojectThenBiosample", () => {
    const steps = deriveFlowSteps(mkSubmission({
      fileEntries: [
        mkEntry("e1", { organism: "eukaryote", access: "open" }),
        mkEntry("e2", { organism: "prokaryote", access: "open" }),
      ],
    }))
    const order = steps.map((s) => s.service)
    expect(order.indexOf("umbrella-bioproject")).toBeLessThan(order.indexOf("bioproject"))
    expect(order.indexOf("bioproject")).toBeLessThan(order.indexOf("biosample"))
  })

  test("deriveFlowSteps_isDeterministic", () => {
    const submission = mkSubmission({
      fileEntries: [
        mkEntry("e1", { organism: "eukaryote", access: "open" }),
        mkEntry("e2", { organism: "human", access: "restricted" }),
      ],
    })
    expect(deriveFlowSteps(submission)).toEqual(deriveFlowSteps(submission))
  })
})
