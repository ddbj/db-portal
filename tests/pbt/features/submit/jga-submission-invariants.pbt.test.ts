import { fc, test } from "@fast-check/vitest"
import { expect } from "vitest"

import { ENGINE_MESSAGE_KEYS as MK } from "../../../../app/features/submit/flow-rules/messages"
import { jgaDatasetSteps } from "../../../../app/features/submit/flow-rules/recipes/jga-submission"
import type { FileEntry, FlowStep } from "../../../../app/schemas/submit"
import { arbSubmission } from "../../arbitraries/submission"

const RUNS = { numRuns: 1000 }

// jgaDatasetSteps の入力 jgaEntries は deriveFlowSteps が service === "jga" に分類した entry 部分集合。
// recipe 自身は access / organism で再フィルタしないため、任意の entry 部分集合を渡せる。
const arbJgaEntries: fc.Arbitrary<FileEntry[]> = arbSubmission.chain((s) =>
  fc.subarray(s.fileEntries, { minLength: 0, maxLength: s.fileEntries.length }),
)

const jgaSteps = (steps: readonly FlowStep[]): FlowStep[] =>
  steps.filter((s) => s.service === "jga")

test("jgaDatasetSteps_noJgaEntries_yieldsNoSteps", () => {
  expect(jgaDatasetSteps([])).toEqual([])
})

test.prop([arbJgaEntries], RUNS)(
  "jgaDatasetSteps_anyJgaEntries_yieldsExactlyOneJgaStep",
  (jgaEntries) => {
    fc.pre(jgaEntries.length > 0)
    const steps = jgaDatasetSteps(jgaEntries)
    expect(jgaSteps(steps)).toHaveLength(1)
    expect(steps).toHaveLength(1)
  },
)

test.prop([arbJgaEntries], RUNS)(
  "jgaDatasetSteps_anyJgaEntries_yieldsNoHumandbsStep",
  (jgaEntries) => {
    // humandbs 前提ゲートは humandbsPolicySteps が独立に emit するので、この recipe は humandbs を返さない
    expect(jgaDatasetSteps(jgaEntries).some((s) => s.service === "humandbs")).toBe(false)
  },
)

test.prop([arbJgaEntries], RUNS)(
  "jgaDatasetSteps_jgaStep_coversEveryJgaEntry",
  (jgaEntries) => {
    fc.pre(jgaEntries.length > 0)
    const steps = jgaDatasetSteps(jgaEntries)
    const expected = new Set(jgaEntries.map((e) => e.id))
    for (const s of steps) {
      expect(new Set(s.scope.entryIds)).toEqual(expected)
    }
  },
)

test.prop([arbJgaEntries], RUNS)(
  "jgaDatasetSteps_anyJgaEntries_emitsNoBioprojectOrBiosampleCompanion",
  (jgaEntries) => {
    const steps = jgaDatasetSteps(jgaEntries)
    // JGA は BioProject/BioSample を使わない: recipe は default companion を一切再出力しない
    expect(steps.some((s) => s.service === "bioproject")).toBe(false)
    expect(steps.some((s) => s.service === "biosample")).toBe(false)
  },
)

test.prop([arbJgaEntries], RUNS)(
  "jgaDatasetSteps_anyStep_scopeEntryIdsSubsetOfJgaEntries",
  (jgaEntries) => {
    const known = new Set(jgaEntries.map((e) => e.id))
    for (const s of jgaDatasetSteps(jgaEntries)) {
      for (const id of s.scope.entryIds) expect(known.has(id)).toBe(true)
    }
  },
)

test.prop([arbJgaEntries], RUNS)(
  "jgaDatasetSteps_anyStepIds_areUnique",
  (jgaEntries) => {
    const ids = jgaDatasetSteps(jgaEntries).map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  },
)

test.prop([arbJgaEntries], RUNS)(
  "jgaDatasetSteps_anyJgaEntries_carryJgaDatasetIntroNote",
  (jgaEntries) => {
    fc.pre(jgaEntries.length > 0)
    const steps = jgaDatasetSteps(jgaEntries)
    expect(jgaSteps(steps)[0]!.notes.map((n) => n.messageKey)).toContain(MK.jgaDatasetIntro)
  },
)

test.prop([arbJgaEntries], RUNS)(
  "jgaDatasetSteps_calledTwice_isIdempotent",
  (jgaEntries) => {
    const first = jgaDatasetSteps(jgaEntries)
    const second = jgaDatasetSteps(jgaEntries)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  },
)

test.prop([arbJgaEntries], RUNS)(
  "jgaDatasetSteps_anyInput_doesNotMutateEntries",
  (jgaEntries) => {
    const snapshot = JSON.stringify(jgaEntries)
    jgaDatasetSteps(jgaEntries)
    expect(JSON.stringify(jgaEntries)).toBe(snapshot)
  },
)
