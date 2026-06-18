import { fc, test } from "@fast-check/vitest"
import { expect } from "vitest"

import { isKindEnabled } from "../../../../app/features/submit/cascade"
import { deriveFlowSteps } from "../../../../app/features/submit/flow-rules"
import { RECIPE_ALLOWLIST } from "../../../../app/features/submit/flow-rules/recipes"
import { type FileEntry, type FlowStep, isSubmissionEndpoint, type Submission } from "../../../../app/schemas/submit"
import { arbSubmission } from "../../arbitraries/submission"

const RUNS = { numRuns: 2000 }

// 前段カスケードで enable された (= 経路導出に乗る) entry か
const isActive = (submission: Submission, e: FileEntry): boolean =>
  isKindEnabled(submission.preconditions.q2, e.fileTypeKind)

const entryIdsWhere = (steps: readonly FlowStep[], pred: (s: FlowStep) => boolean): Set<string> => {
  const ids = new Set<string>()
  for (const s of steps) {
    if (!pred(s)) continue
    for (const id of s.scope.entryIds) ids.add(id)
  }

  return ids
}

const recipeSteps = (steps: readonly FlowStep[]): FlowStep[] =>
  steps.filter((s) => s.origin === "recipe")

const isSpatialKind = (k: string): boolean =>
  k === "spatial-transcriptomics" || k === "spatial-image"

test.prop([arbSubmission], RUNS)(
  "RECIPE_ALLOWLIST_isImmutableAndAllRecipeStepIdsTraceToAllowlist",
  (submission) => {
    // allowlist は重複なし・空でない不変集合 (jga / spatial の 2 named recipe)
    expect(new Set(RECIPE_ALLOWLIST).size).toBe(RECIPE_ALLOWLIST.length)
    expect(RECIPE_ALLOWLIST.length).toBeGreaterThan(0)
    const allowedPrefixes = ["recipe-jga", "recipe-spatial"]
    for (const s of recipeSteps(deriveFlowSteps(submission))) {
      expect(allowedPrefixes.some((p) => s.id.startsWith(p))).toBe(true)
    }
  },
)

test.prop([arbSubmission], RUNS)(
  "deriveFlowSteps_jgaEntries_excludedFromTier2CompanionScope",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    const jgaIds = entryIdsWhere(steps, (s) => s.service === "jga")
    fc.pre(jgaIds.size > 0)
    // jga recipe は companion を抑制する: JGA に route された entry は tier2 (bioproject/biosample) に現れない
    const tier2Ids = entryIdsWhere(steps, (s) => s.origin === "tier2")
    for (const id of jgaIds) {
      expect(tier2Ids.has(id)).toBe(false)
    }
  },
)

test.prop([arbSubmission], RUNS)(
  "deriveFlowSteps_spatialEntry_keepsDefaultCompanion",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    const tier2Ids = entryIdsWhere(steps, (s) => s.origin === "tier2")
    const jgaIds = entryIdsWhere(steps, (s) => s.service === "jga")
    // spatial recipe は default companion を維持する (JGA に行った spatial は jga-submission recipe が companion 抑制)
    for (const e of submission.fileEntries) {
      if (!isSpatialKind(e.fileTypeKind)) continue
      if (!isActive(submission, e)) continue
      if (jgaIds.has(e.id)) continue
      expect(tier2Ids.has(e.id)).toBe(true)
    }
  },
)

test.prop([arbSubmission], RUNS)(
  "deriveFlowSteps_recipeApplied_everyEntryLandsInSomeEndpoint",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    const endpointIds = entryIdsWhere(steps, (s) => isSubmissionEndpoint(s.service))
    // recipe 適用後も全 enable entry が宙に浮かない (no-orphan-destination を recipe 出力でも維持)
    for (const e of submission.fileEntries) {
      if (!isActive(submission, e)) continue
      expect(endpointIds.has(e.id)).toBe(true)
    }
  },
)
