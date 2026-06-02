import { fc, test } from "@fast-check/vitest"
import { expect } from "vitest"

import { ENGINE_MESSAGE_KEYS as MK } from "../../../../app/features/submit/flow-rules/messages"
import { jgaSubmissionSteps } from "../../../../app/features/submit/flow-rules/recipes/jga-submission"
import type { FileEntry, FlowStep } from "../../../../app/schemas/submit"
import { arbSubmission } from "../../arbitraries/submission"

const RUNS = { numRuns: 1000 }

// jgaSubmissionSteps の入力 jgaEntries は deriveFlowSteps が service === "jga" に分類した entry 部分集合。
// recipe 自身は access / organism で再フィルタしないため、任意の entry 部分集合を渡せる。
const arbJgaEntries: fc.Arbitrary<FileEntry[]> = arbSubmission.chain((s) =>
  fc.subarray(s.fileEntries, { minLength: 0, maxLength: s.fileEntries.length }),
)

const policySteps = (steps: readonly FlowStep[]): FlowStep[] =>
  steps.filter((s) => s.service === "humandbs")
const jgaSteps = (steps: readonly FlowStep[]): FlowStep[] =>
  steps.filter((s) => s.service === "jga")

test("jgaSubmissionSteps_noJgaEntries_yieldsNoSteps", () => {
  expect(jgaSubmissionSteps([])).toEqual([])
})

test.prop([arbJgaEntries], RUNS)(
  "jgaSubmissionSteps_anyJgaEntries_yieldsExactlyOnePolicyAndOneJgaStep",
  (jgaEntries) => {
    fc.pre(jgaEntries.length > 0)
    const steps = jgaSubmissionSteps(jgaEntries)
    expect(policySteps(steps)).toHaveLength(1)
    expect(jgaSteps(steps)).toHaveLength(1)
  },
)

test.prop([arbJgaEntries], RUNS)(
  "jgaSubmissionSteps_policyAndJgaSteps_coverEveryJgaEntryWithoutMerging",
  (jgaEntries) => {
    fc.pre(jgaEntries.length > 0)
    const steps = jgaSubmissionSteps(jgaEntries)
    const expected = new Set(jgaEntries.map((e) => e.id))
    // Policy ゲートと JGA 登録はともに全 jgaEntries を 1 ステップに束ねる (Dataset ごとに分割しない)
    for (const s of steps) {
      expect(new Set(s.scope.entryIds)).toEqual(expected)
    }
  },
)

test.prop([arbJgaEntries], RUNS)(
  "jgaSubmissionSteps_anyJgaEntries_emitsNoBioprojectOrBiosampleCompanion",
  (jgaEntries) => {
    const steps = jgaSubmissionSteps(jgaEntries)
    // JGA は BioProject/BioSample を使わない: recipe は default companion を一切再出力しない
    expect(steps.some((s) => s.service === "bioproject")).toBe(false)
    expect(steps.some((s) => s.service === "biosample")).toBe(false)
  },
)

test.prop([arbJgaEntries], RUNS)(
  "jgaSubmissionSteps_anyStep_scopeEntryIdsSubsetOfJgaEntries",
  (jgaEntries) => {
    const known = new Set(jgaEntries.map((e) => e.id))
    for (const s of jgaSubmissionSteps(jgaEntries)) {
      for (const id of s.scope.entryIds) expect(known.has(id)).toBe(true)
    }
  },
)

test.prop([arbJgaEntries], RUNS)(
  "jgaSubmissionSteps_anyStepIds_areUnique",
  (jgaEntries) => {
    const ids = jgaSubmissionSteps(jgaEntries).map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  },
)

test.prop([arbJgaEntries], RUNS)(
  "jgaSubmissionSteps_anyJgaEntries_carryPolicyAndJgaNotes",
  (jgaEntries) => {
    fc.pre(jgaEntries.length > 0)
    const steps = jgaSubmissionSteps(jgaEntries)
    const policyKeys = policySteps(steps)[0]!.notes.map((n) => n.messageKey)
    expect(policyKeys).toContain(MK.jgaPolicyApplication)
    expect(policyKeys).toContain(MK.jgaNbdcPolicy)
    expect(jgaSteps(steps)[0]!.notes.map((n) => n.messageKey)).toContain(MK.jgaDatasetIntro)
  },
)

test.prop([arbJgaEntries], RUNS)(
  "jgaSubmissionSteps_policyGate_precedesJgaStep",
  (jgaEntries) => {
    fc.pre(jgaEntries.length > 0)
    const steps = jgaSubmissionSteps(jgaEntries)
    const policyIdx = steps.findIndex((s) => s.service === "humandbs")
    const jgaIdx = steps.findIndex((s) => s.service === "jga")
    // Policy 承認は JGA 登録の前提ゲートなので、必ず JGA step より前に出る
    expect(policyIdx).toBeGreaterThanOrEqual(0)
    expect(jgaIdx).toBeGreaterThan(policyIdx)
  },
)

test.prop([arbJgaEntries], RUNS)(
  "jgaSubmissionSteps_calledTwice_isIdempotent",
  (jgaEntries) => {
    const first = jgaSubmissionSteps(jgaEntries)
    const second = jgaSubmissionSteps(jgaEntries)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  },
)

test.prop([arbJgaEntries], RUNS)(
  "jgaSubmissionSteps_anyInput_doesNotMutateEntries",
  (jgaEntries) => {
    const snapshot = JSON.stringify(jgaEntries)
    jgaSubmissionSteps(jgaEntries)
    expect(JSON.stringify(jgaEntries)).toBe(snapshot)
  },
)
