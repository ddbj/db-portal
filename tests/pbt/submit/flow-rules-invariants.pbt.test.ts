import { fc, test } from "@fast-check/vitest"
import { expect } from "vitest"

import { isKindEnabled } from "../../../app/features/submit/cascade"
import { deriveFlowSteps } from "../../../app/features/submit/flow-rules"
import {
  type FileEntry,
  type FlowStep,
  isSequencingSpatialPlatform,
  isSubmissionEndpoint,
  SERVICE_DEPENDENCY_ORDER,
  type Submission,
} from "../../../app/schemas/submit"
import { arbSubmission } from "../arbitraries/submission"

const RUNS = { numRuns: 1000 }

const entryIdsOfService = (steps: readonly FlowStep[], pred: (s: FlowStep) => boolean): Set<string> => {
  const ids = new Set<string>()
  for (const s of steps) {
    if (!pred(s)) continue
    for (const id of s.scope.entryIds) ids.add(id)
  }

  return ids
}

// 前段カスケードで enable された (= 経路導出に乗る) entry か
const isActive = (submission: Submission, e: FileEntry): boolean =>
  isKindEnabled(submission.preconditions.q1, submission.preconditions.q2, e.fileTypeKind)

test.prop([arbSubmission], RUNS)(
  "deriveFlowSteps_anySubmission_isDeterministic",
  (submission) => {
    expect(JSON.stringify(deriveFlowSteps(submission))).toBe(JSON.stringify(deriveFlowSteps(submission)))
  },
)

test.prop([arbSubmission], RUNS)(
  "deriveFlowSteps_anySubmission_doesNotMutateInput",
  (submission) => {
    const snapshot = JSON.stringify(submission)
    deriveFlowSteps(submission)
    expect(JSON.stringify(submission)).toBe(snapshot)
  },
)

test.prop([arbSubmission], RUNS)(
  "deriveFlowSteps_emptyEntries_yieldsEmptySteps",
  (submission) => {
    const empty: Submission = { ...submission, fileEntries: [] }
    expect(deriveFlowSteps(empty)).toEqual([])
  },
)

test.prop([arbSubmission], RUNS)(
  "deriveFlowSteps_anyEnabledEntry_yieldsAtLeastOneStep",
  (submission) => {
    fc.pre(submission.fileEntries.some((e) => isActive(submission, e)))
    expect(deriveFlowSteps(submission).length).toBeGreaterThan(0)
  },
)

test.prop([arbSubmission], RUNS)(
  "deriveFlowSteps_plainSubmission_yieldsExactlyOneBioprojectAndBiosample",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    const jgaIds = entryIdsOfService(steps, (s) => s.service === "jga")
    // enable かつ非 jga の entry があるときだけ既定 companion が出る
    fc.pre(submission.fileEntries.some((e) => isActive(submission, e) && !jgaIds.has(e.id)))
    expect(steps.filter((s) => s.service === "bioproject")).toHaveLength(1)
    expect(steps.filter((s) => s.service === "biosample")).toHaveLength(1)
  },
)

test.prop([arbSubmission], RUNS)(
  "deriveFlowSteps_sequenceRead_partitionsByJgaOrDraExclusively",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    const jgaIds = entryIdsOfService(steps, (s) => s.service === "jga")
    const draIds = entryIdsOfService(steps, (s) => s.service === "dra")
    const q2 = submission.preconditions.q2
    for (const e of submission.fileEntries) {
      if (e.fileTypeKind !== "sequence-read") continue
      if (!isActive(submission, e)) continue
      // JGA はヒト個人のみ。restricted でも非ヒト (metagenome 含む) は DRA(embargo) に行く
      const toJga = e.access === "restricted" && q2 === "human"
      if (toJga) {
        expect(jgaIds.has(e.id)).toBe(true)
        expect(draIds.has(e.id)).toBe(false)
      } else {
        expect(draIds.has(e.id)).toBe(true)
        expect(jgaIds.has(e.id)).toBe(false)
      }
    }
  },
)

test.prop([arbSubmission], RUNS)(
  "deriveFlowSteps_anyStep_scopeEntryIdsSubsetOfSubmissionEntries",
  (submission) => {
    const known = new Set(submission.fileEntries.map((e) => e.id))
    for (const s of deriveFlowSteps(submission)) {
      for (const id of s.scope.entryIds) expect(known.has(id)).toBe(true)
    }
  },
)

test.prop([arbSubmission], RUNS)(
  "deriveFlowSteps_anyStep_scopeIsNonEmpty",
  (submission) => {
    for (const s of deriveFlowSteps(submission)) {
      expect(s.scope.entryIds.length + s.scope.groupIds.length).toBeGreaterThan(0)
    }
  },
)

test.prop([arbSubmission], RUNS)(
  "deriveFlowSteps_anySubmission_stepIdsAreUnique",
  (submission) => {
    const ids = deriveFlowSteps(submission).map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  },
)

test.prop([arbSubmission], RUNS)(
  "deriveFlowSteps_anySubmission_orderRespectsDependencyOrder",
  (submission) => {
    const rank = (s: FlowStep) => SERVICE_DEPENDENCY_ORDER.indexOf(s.service)
    const steps = deriveFlowSteps(submission)
    for (let i = 1; i < steps.length; i++) {
      const prev = steps[i - 1]!
      const cur = steps[i]!
      if (rank(prev) === rank(cur)) {
        expect(prev.id.localeCompare(cur.id)).toBeLessThanOrEqual(0)
      } else {
        expect(rank(prev)).toBeLessThan(rank(cur))
      }
    }
  },
)

test.prop([arbSubmission], RUNS)(
  "deriveFlowSteps_everyEnabledEntry_appearsInSomeEndpointStep",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    // 登録エンドポイント = DDBJ 内 destination ∪ 外部の最終格納先 (jpost / eva)
    const endpointIds = entryIdsOfService(steps, (s) => isSubmissionEndpoint(s.service))
    for (const e of submission.fileEntries) {
      if (!isActive(submission, e)) continue
      expect(endpointIds.has(e.id)).toBe(true)
    }
  },
)

test.prop([arbSubmission], RUNS)(
  "deriveFlowSteps_disabledKind_appearsInNoStep",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    const inAnyScope = new Set<string>()
    for (const s of steps) for (const id of s.scope.entryIds) inAnyScope.add(id)
    // 前段で disable された選択種別は step を生成せず、scope にも現れない (group member 漏れも検知)
    for (const e of submission.fileEntries) {
      if (isActive(submission, e)) continue
      expect(inAnyScope.has(e.id)).toBe(false)
    }
  },
)

test.prop([arbSubmission], RUNS)(
  "deriveFlowSteps_spatialGroupKind_stepCoversWholeGroup",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    const isSpatial = (k: string) => k === "spatial-image" || k === "spatial-transcriptomics"
    for (const e of submission.fileEntries) {
      if (!isSpatial(e.fileTypeKind)) continue
      if (!isActive(submission, e)) continue
      const geaStep = steps.find((s) => s.service === "gea" && s.scope.entryIds.includes(e.id))
      expect(geaStep).toBeDefined()
      expect(geaStep!.scope.groupIds).toContain(e.groupId)
    }
  },
)

test.prop([arbSubmission], RUNS)(
  "deriveFlowSteps_spatialPlatform_sequencingEntersDraAndGeaMicroarrayGeaOnly",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    const geaIds = entryIdsOfService(steps, (s) => s.service === "gea")
    const draIds = entryIdsOfService(steps, (s) => s.service === "dra")
    const isSpatial = (k: string) => k === "spatial-image" || k === "spatial-transcriptomics"
    for (const e of submission.fileEntries) {
      if (!isSpatial(e.fileTypeKind)) continue
      if (!isActive(submission, e)) continue
      const sequencing = e.chipTags.some(
        (c) => c.axis === "spatial-platform" && isSequencingSpatialPlatform(c.value),
      )
      // Sequencing 系 platform は DRA + GEA の 2 段、それ以外 (Microarray / 未指定) は GEA のみ
      expect(geaIds.has(e.id)).toBe(true)
      expect(draIds.has(e.id)).toBe(sequencing)
    }
  },
)
