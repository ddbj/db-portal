import { fc, test } from "@fast-check/vitest"
import { expect } from "vitest"

import { ENGINE_MESSAGE_KEYS as MK } from "../../../../app/features/submit/flow-rules/messages"
import { jgaSubmissionSteps } from "../../../../app/features/submit/flow-rules/recipes/jga-submission"
import type { FileEntry, FlowStep, Submission } from "../../../../app/schemas/submit"
import { arbSubmission } from "../../arbitraries/submission"

const RUNS = { numRuns: 1000 }

// jgaSubmissionSteps の入力 jgaEntries は呼び出し側 (deriveFlowSteps) が routing で
// service === "jga" に分類した entry 部分集合。recipe 自身は access / organism で再フィルタ
// しないため、生成された Submission の任意の entry 部分集合を jgaEntries として渡せる。
const arbJgaScenario: fc.Arbitrary<{ submission: Submission; jgaEntries: FileEntry[] }> =
  arbSubmission.chain((submission) =>
    fc
      .subarray(submission.fileEntries, { minLength: 0, maxLength: submission.fileEntries.length })
      .map((jgaEntries) => ({ submission, jgaEntries })),
  )

// jga-dataset group 同士を linkedGroupIds で相互参照させ、Dataset 束ねの重なりを誘発する。
// 異なる Policy 由来データが disjoint な Dataset に分かれる不変量の検出力を上げる。
const arbLinkedJgaScenario: fc.Arbitrary<{ submission: Submission; jgaEntries: FileEntry[] }> =
  arbJgaScenario.chain(({ submission, jgaEntries }) => {
    const datasetGroupIds = submission.fileGroups
      .filter((g) => g.groupType === "jga-dataset")
      .map((g) => g.id)

    return fc
      .array(fc.subarray(datasetGroupIds), {
        minLength: datasetGroupIds.length,
        maxLength: datasetGroupIds.length,
      })
      .map((linksPerGroup) => {
        const fileGroups = submission.fileGroups.map((g) => {
          if (g.groupType !== "jga-dataset") return g
          const idx = datasetGroupIds.indexOf(g.id)
          const linkedGroupIds = (linksPerGroup[idx] ?? []).filter((id) => id !== g.id)

          return { ...g, linkedGroupIds }
        })

        return { submission: { ...submission, fileGroups }, jgaEntries }
      })
  })

const datasetSteps = (steps: readonly FlowStep[]): FlowStep[] =>
  steps.filter((s) => s.service === "jga")

const policySteps = (steps: readonly FlowStep[]): FlowStep[] =>
  steps.filter((s) => s.service === "humandbs")

const dataStepsCovering = (steps: readonly FlowStep[]): FlowStep[] =>
  steps.filter((s) => s.id.startsWith("recipe-jga-dataset-"))

test.prop([arbSubmission], RUNS)(
  "jgaSubmissionSteps_noJgaEntries_yieldsNoSteps",
  (submission) => {
    expect(jgaSubmissionSteps(submission, [])).toEqual([])
  },
)

test.prop([arbJgaScenario], RUNS)(
  "jgaSubmissionSteps_anyJgaEntries_yieldsExactlyOnePolicyStep",
  ({ submission, jgaEntries }) => {
    fc.pre(jgaEntries.length > 0)
    const steps = jgaSubmissionSteps(submission, jgaEntries)
    expect(policySteps(steps)).toHaveLength(1)
  },
)

test.prop([arbJgaScenario], RUNS)(
  "jgaSubmissionSteps_singlePolicyStep_coversEveryJgaEntryWithoutMerging",
  ({ submission, jgaEntries }) => {
    fc.pre(jgaEntries.length > 0)
    const steps = jgaSubmissionSteps(submission, jgaEntries)
    const policy = policySteps(steps)
    expect(policy).toHaveLength(1)
    const expectedEntryIds = new Set(jgaEntries.map((e) => e.id))
    const policyEntryIds = new Set(policy[0]!.scope.entryIds)
    // Policy は全 jgaEntries を 1 ステップに束ねる (Dataset ごとに分割・追加生成しない)
    expect(policyEntryIds).toEqual(expectedEntryIds)
    expect(policy[0]!.id).toBe("recipe-jga-policy")
  },
)

test.prop([arbJgaScenario], RUNS)(
  "jgaSubmissionSteps_anyJgaEntries_emitsNoBioprojectOrBiosampleCompanion",
  ({ submission, jgaEntries }) => {
    const steps = jgaSubmissionSteps(submission, jgaEntries)
    // recipe は default companion (bioproject + biosample) を一切再出力しない
    expect(steps.some((s) => s.service === "bioproject")).toBe(false)
    expect(steps.some((s) => s.service === "biosample")).toBe(false)
  },
)

test.prop([arbLinkedJgaScenario], RUNS)(
  "jgaSubmissionSteps_anyJgaEntry_belongsToExactlyOneDataset",
  ({ submission, jgaEntries }) => {
    fc.pre(jgaEntries.length > 0)
    const steps = jgaSubmissionSteps(submission, jgaEntries)
    const dataSteps = dataStepsCovering(steps)
    const occurrences = new Map<string, number>()
    for (const s of dataSteps) {
      for (const id of new Set(s.scope.entryIds)) {
        occurrences.set(id, (occurrences.get(id) ?? 0) + 1)
      }
    }
    // 異なる Dataset (= 異なる Policy 単位) のデータは disjoint。各 entry は
    // ちょうど 1 つの Dataset ステップに属する。
    for (const e of jgaEntries) {
      expect(occurrences.get(e.id) ?? 0).toBe(1)
    }
  },
)

test.prop([arbLinkedJgaScenario], RUNS)(
  "jgaSubmissionSteps_datasetSteps_partitionJgaEntriesExactly",
  ({ submission, jgaEntries }) => {
    fc.pre(jgaEntries.length > 0)
    const steps = jgaSubmissionSteps(submission, jgaEntries)
    const covered = dataStepsCovering(steps).flatMap((s) => s.scope.entryIds)
    const expectedEntryIds = new Set(jgaEntries.map((e) => e.id))
    // Dataset ステップ全体の entryIds は重複なく jgaEntries を覆い尽くす
    expect(new Set(covered)).toEqual(expectedEntryIds)
    expect(covered.length).toBe(expectedEntryIds.size)
  },
)

test.prop([arbJgaScenario], RUNS)(
  "jgaSubmissionSteps_anyDatasetStep_referencesTheSingleSharedPolicy",
  ({ submission, jgaEntries }) => {
    fc.pre(jgaEntries.length > 0)
    const steps = jgaSubmissionSteps(submission, jgaEntries)
    const policy = policySteps(steps)
    expect(policy).toHaveLength(1)
    const policyEntryIds = new Set(policy[0]!.scope.entryIds)
    // 各 Dataset の entry は唯一の Policy ステップに包含される (1 Dataset → 1 Policy)
    for (const s of datasetSteps(steps)) {
      for (const id of s.scope.entryIds) {
        expect(policyEntryIds.has(id)).toBe(true)
      }
    }
  },
)

test.prop([arbJgaScenario], RUNS)(
  "jgaSubmissionSteps_anyStep_scopeEntryIdsSubsetOfJgaEntries",
  ({ submission, jgaEntries }) => {
    const known = new Set(jgaEntries.map((e) => e.id))
    for (const s of jgaSubmissionSteps(submission, jgaEntries)) {
      for (const id of s.scope.entryIds) expect(known.has(id)).toBe(true)
    }
  },
)

test.prop([arbJgaScenario], RUNS)(
  "jgaSubmissionSteps_anyStepIds_areUnique",
  ({ submission, jgaEntries }) => {
    const ids = jgaSubmissionSteps(submission, jgaEntries).map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  },
)

test.prop([arbJgaScenario], RUNS)(
  "jgaSubmissionSteps_anyStep_carriesPolicyOrDatasetNotes",
  ({ submission, jgaEntries }) => {
    fc.pre(jgaEntries.length > 0)
    const steps = jgaSubmissionSteps(submission, jgaEntries)
    for (const s of datasetSteps(steps)) {
      expect(s.notes.map((n) => n.messageKey)).toContain(MK.jgaDatasetIntro)
    }
    const policy = policySteps(steps)[0]!
    const policyKeys = policy.notes.map((n) => n.messageKey)
    expect(policyKeys).toContain(MK.jgaPolicyApplication)
    expect(policyKeys).toContain(MK.jgaNbdcPolicy)
  },
)

test.prop([arbLinkedJgaScenario], RUNS)(
  "jgaSubmissionSteps_calledTwice_isIdempotent",
  ({ submission, jgaEntries }) => {
    const first = jgaSubmissionSteps(submission, jgaEntries)
    const second = jgaSubmissionSteps(submission, jgaEntries)
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  },
)

test.prop([arbLinkedJgaScenario], RUNS)(
  "jgaSubmissionSteps_anyInput_doesNotMutateSubmissionOrEntries",
  ({ submission, jgaEntries }) => {
    const submissionSnapshot = JSON.stringify(submission)
    const entriesSnapshot = JSON.stringify(jgaEntries)
    jgaSubmissionSteps(submission, jgaEntries)
    expect(JSON.stringify(submission)).toBe(submissionSnapshot)
    expect(JSON.stringify(jgaEntries)).toBe(entriesSnapshot)
  },
)
