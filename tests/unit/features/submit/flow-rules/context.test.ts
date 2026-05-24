import { describe, expect, test } from "vitest"

import { deriveFlowContext } from "../../../../../app/features/submit/flow-rules"
import { mkEntry, mkSubmission } from "./_helpers"

describe("deriveFlowContext", () => {
  test("deriveFlowContext_emptySubmission_yieldsNoAssignments", () => {
    const ctx = deriveFlowContext(mkSubmission())
    expect(ctx.primaryBioprojectAssignments).toEqual([])
  })

  test("deriveFlowContext_singleHumanEntry_yieldsOneAssignment", () => {
    const ctx = deriveFlowContext(mkSubmission({
      fileEntries: [mkEntry("e1", { organism: "human", access: "open" })],
    }))
    expect(ctx.primaryBioprojectAssignments).toHaveLength(1)
    expect(ctx.primaryBioprojectAssignments[0]!.organism).toBe("human")
    expect(ctx.primaryBioprojectAssignments[0]!.bpId).toBe("bioproject:human")
  })

  test("deriveFlowContext_twoOrganisms_yieldsTwoAssignmentsSortedByBpId", () => {
    const ctx = deriveFlowContext(mkSubmission({
      fileEntries: [
        mkEntry("e1", { organism: "prokaryote" }),
        mkEntry("e2", { organism: "eukaryote" }),
      ],
    }))
    expect(ctx.primaryBioprojectAssignments).toHaveLength(2)
    expect(ctx.primaryBioprojectAssignments[0]!.bpId.localeCompare(
      ctx.primaryBioprojectAssignments[1]!.bpId,
    )).toBeLessThan(0)
  })

  test("deriveFlowContext_assignmentEntryIds_aggregatedPerOrganism", () => {
    const ctx = deriveFlowContext(mkSubmission({
      fileEntries: [
        mkEntry("e1", { organism: "human" }),
        mkEntry("e2", { organism: "human" }),
        mkEntry("e3", { organism: "virus" }),
      ],
    }))
    const human = ctx.primaryBioprojectAssignments.find((a) => a.organism === "human")
    expect(human!.entryIds.length).toBe(2)
  })
})
