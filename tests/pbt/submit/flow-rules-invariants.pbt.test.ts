import { test } from "@fast-check/vitest"
import { expect } from "vitest"

import { deriveFlowSteps } from "../../../app/features/submit/flow-rules"
import { SERVICE_PHYSICAL_ORDER } from "../../../app/schemas/submit"
import { arbSubmission } from "../arbitraries/submission"

const numRuns = 1000

test.prop([arbSubmission], { numRuns })(
  "deriveFlowSteps_anySubmission_isIdempotent",
  (submission) => {
    const a = deriveFlowSteps(submission)
    const b = deriveFlowSteps(submission)
    expect(b).toEqual(a)
  },
)

test.prop([arbSubmission], { numRuns })(
  "deriveFlowSteps_anySubmission_doesNotMutateInput",
  (submission) => {
    const snapshot = structuredClone(submission)
    deriveFlowSteps(submission)
    expect(submission).toEqual(snapshot)
  },
)

test.prop([arbSubmission], { numRuns })(
  "deriveFlowSteps_emptyEntries_yieldsEmptySteps",
  (submission) => {
    if (submission.fileEntries.length > 0) return
    expect(deriveFlowSteps(submission)).toEqual([])
  },
)

test.prop([arbSubmission], { numRuns })(
  "deriveFlowSteps_anyEntries_biosampleStepExists",
  (submission) => {
    if (submission.fileEntries.length === 0) return
    const steps = deriveFlowSteps(submission)
    expect(steps.some((s) => s.service === "biosample")).toBe(true)
  },
)

test.prop([arbSubmission], { numRuns })(
  "deriveFlowSteps_anyEntries_bioprojectStepExists",
  (submission) => {
    if (submission.fileEntries.length === 0) return
    const steps = deriveFlowSteps(submission)
    expect(steps.some((s) => s.service === "bioproject")).toBe(true)
  },
)

test.prop([arbSubmission], { numRuns })(
  "deriveFlowSteps_multiplePrimaryBioproject_yieldsExactlyOneUmbrella",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    const primaryCount = steps.filter((s) => s.service === "bioproject").length
    const umbrellaCount = steps.filter((s) => s.service === "umbrella-bioproject").length
    if (primaryCount >= 2) {
      expect(umbrellaCount).toBe(1)
    } else {
      expect(umbrellaCount).toBe(0)
    }
  },
)

test.prop([arbSubmission], { numRuns })(
  "deriveFlowSteps_umbrellaScope_isUnionOfPrimaryBioprojectScopes",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    const umbrella = steps.find((s) => s.service === "umbrella-bioproject")
    if (!umbrella) return
    const primaryEntryIds = new Set(
      steps.filter((s) => s.service === "bioproject").flatMap((s) => s.scope.entryIds),
    )
    const primaryGroupIds = new Set(
      steps.filter((s) => s.service === "bioproject").flatMap((s) => s.scope.groupIds),
    )
    expect(new Set(umbrella.scope.entryIds)).toEqual(primaryEntryIds)
    expect(new Set(umbrella.scope.groupIds)).toEqual(primaryGroupIds)
  },
)

test.prop([arbSubmission], { numRuns })(
  "deriveFlowSteps_sequenceReadRows_partitionByJgaOrDra",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    const draEntryIds = new Set(
      steps.filter((s) => s.service === "dra").flatMap((s) => s.scope.entryIds),
    )
    const jgaEntryIds = new Set(
      steps.filter((s) => s.service === "jga").flatMap((s) => s.scope.entryIds),
    )
    for (const e of submission.fileEntries) {
      if (e.buttonType !== "sequence-read") continue
      const isRestrictedHuman = e.access === "restricted" && e.organism === "human"
      if (isRestrictedHuman) {
        expect(jgaEntryIds.has(e.id)).toBe(true)
        expect(draEntryIds.has(e.id)).toBe(false)
      } else {
        expect(draEntryIds.has(e.id)).toBe(true)
        expect(jgaEntryIds.has(e.id)).toBe(false)
      }
    }
  },
)

test.prop([arbSubmission], { numRuns })(
  "deriveFlowSteps_draScope_onlyContainsSequenceReadEntries",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    const draEntryIds = new Set(
      steps.filter((s) => s.service === "dra").flatMap((s) => s.scope.entryIds),
    )
    for (const e of submission.fileEntries) {
      if (draEntryIds.has(e.id)) {
        expect(e.buttonType).toBe("sequence-read")
      }
    }
  },
)

test.prop([arbSubmission], { numRuns })(
  "deriveFlowSteps_jgaScope_onlyContainsRestrictedHumanSequenceReadEntries",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    const jgaEntryIds = new Set(
      steps.filter((s) => s.service === "jga").flatMap((s) => s.scope.entryIds),
    )
    for (const e of submission.fileEntries) {
      if (jgaEntryIds.has(e.id)) {
        expect(e.buttonType).toBe("sequence-read")
        expect(e.access).toBe("restricted")
        expect(e.organism).toBe("human")
      }
    }
  },
)

test.prop([arbSubmission], { numRuns })(
  "deriveFlowSteps_scopeEntryIds_subsetOfSubmissionEntries",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    const allEntryIds = new Set(submission.fileEntries.map((e) => e.id))
    for (const s of steps) {
      for (const id of s.scope.entryIds) {
        expect(allEntryIds.has(id)).toBe(true)
      }
    }
  },
)

test.prop([arbSubmission], { numRuns })(
  "deriveFlowSteps_anySubmission_orderRespectsPhysicalOrder",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    const ranks = steps.map((s) => SERVICE_PHYSICAL_ORDER.indexOf(s.service))
    for (let i = 1; i < ranks.length; i++) {
      expect(ranks[i]! >= ranks[i - 1]!).toBe(true)
    }
  },
)

test.prop([arbSubmission], { numRuns })(
  "deriveFlowSteps_bioprojectStep_appearsBeforeBiosampleStep",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    const bpIdx = steps.findIndex((s) => s.service === "bioproject")
    const bsIdx = steps.findIndex((s) => s.service === "biosample")
    if (bpIdx === -1 || bsIdx === -1) return
    expect(bpIdx).toBeLessThan(bsIdx)
  },
)

test.prop([arbSubmission], { numRuns })(
  "deriveFlowSteps_umbrellaStep_appearsBeforeBioprojectStep",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    const umIdx = steps.findIndex((s) => s.service === "umbrella-bioproject")
    const bpIdx = steps.findIndex((s) => s.service === "bioproject")
    if (umIdx === -1 || bpIdx === -1) return
    expect(umIdx).toBeLessThan(bpIdx)
  },
)

test.prop([arbSubmission], { numRuns })(
  "deriveFlowSteps_anySubmission_stepIdsUnique",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    const ids = steps.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  },
)

test.prop([arbSubmission], { numRuns })(
  "deriveFlowSteps_anySubmission_scopeNonEmpty",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    for (const s of steps) {
      const nonEmpty = s.scope.entryIds.length > 0 || s.scope.groupIds.length > 0
      expect(nonEmpty).toBe(true)
    }
  },
)
