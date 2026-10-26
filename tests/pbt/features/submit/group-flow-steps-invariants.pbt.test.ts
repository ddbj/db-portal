import { test } from "@fast-check/vitest"
import { expect } from "vitest"

import { type FlowStepGroupKey, groupFlowSteps } from "../../../../app/features/submit/flow-cards/group-flow-steps"
import { deriveFlowSteps } from "../../../../app/features/submit/flow-rules"
import { type FileEntry, type FlowStep, isCompanionService, serviceRoleTagKey } from "../../../../app/schemas/submit"
import { arbSubmission } from "../../arbitraries/submission"

const RUNS = { numRuns: 1000 }

const GROUP_ORDER: readonly FlowStepGroupKey[] = ["companion", "gate", "restricted", "open", "destination"]

const touchesRestricted = (step: FlowStep, entries: readonly FileEntry[]): boolean =>
  entries.some((e) => step.scope.entryIds.includes(e.id) && e.access === "restricted")

test.prop([arbSubmission], RUNS)(
  "groupFlowSteps_anySubmission_placesEveryStepInExactlyOneGroup",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    const groups = groupFlowSteps(steps, submission.fileEntries, submission.preconditions.organismDomain === "human")
    const grouped = groups.flatMap((g) => g.steps.map((s) => s.id))

    expect(grouped).toHaveLength(steps.length)
    expect([...grouped].sort()).toEqual(steps.map((s) => s.id).sort())
  },
)

test.prop([arbSubmission], RUNS)(
  "groupFlowSteps_anySubmission_keepsInputOrderWithinEachGroup",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    const indexOf = new Map(steps.map((s, i) => [s.id, i]))
    const groups = groupFlowSteps(steps, submission.fileEntries, submission.preconditions.organismDomain === "human")

    for (const g of groups) {
      const indices = g.steps.map((s) => indexOf.get(s.id)!)
      expect(indices).toEqual([...indices].sort((a, b) => a - b))
    }
  },
)

test.prop([arbSubmission], RUNS)(
  "groupFlowSteps_anySubmission_emitsNonEmptyGroupsInFixedOrderWithoutRepeats",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    const groups = groupFlowSteps(steps, submission.fileEntries, submission.preconditions.organismDomain === "human")
    const ranks = groups.map((g) => GROUP_ORDER.indexOf(g.key))

    for (const g of groups) expect(g.steps.length).toBeGreaterThan(0)
    for (let i = 1; i < ranks.length; i++) expect(ranks[i]!).toBeGreaterThan(ranks[i - 1]!)
  },
)

test.prop([arbSubmission], RUNS)(
  "groupFlowSteps_human_putsGateStepsOnlyInGateGroupAndUsesNoDestinationGroup",
  (submission) => {
    const steps = deriveFlowSteps({ ...submission, preconditions: { organismDomain: "human" } })
    const groups = groupFlowSteps(steps, submission.fileEntries, true)

    expect(groups.map((g) => g.key)).not.toContain("destination")
    for (const g of groups) {
      for (const s of g.steps) {
        const isGate = serviceRoleTagKey(s.service) === "gate"
        expect(g.key === "gate").toBe(isGate)
      }
    }
  },
)

test.prop([arbSubmission], RUNS)(
  "groupFlowSteps_human_splitsNonGateStepsByWhetherAnyScopedEntryIsRestricted",
  (submission) => {
    const steps = deriveFlowSteps({ ...submission, preconditions: { organismDomain: "human" } })
    const groups = groupFlowSteps(steps, submission.fileEntries, true)

    for (const g of groups) {
      for (const s of g.steps) {
        if (g.key === "restricted") expect(touchesRestricted(s, submission.fileEntries)).toBe(true)
        if (g.key === "open") expect(touchesRestricted(s, submission.fileEntries)).toBe(false)
      }
    }
  },
)

test.prop([arbSubmission], RUNS)(
  "groupFlowSteps_nonHuman_usesOnlyCompanionAndDestinationGroups",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    const groups = groupFlowSteps(steps, submission.fileEntries, false)

    for (const g of groups) {
      expect(["companion", "destination"]).toContain(g.key)
      for (const s of g.steps) expect(g.key === "companion").toBe(isCompanionService(s.service))
    }
  },
)
