import { fc, test } from "@fast-check/vitest"
import { expect } from "vitest"

import { deriveFlowSteps } from "../../../../app/features/submit/flow-rules"
import { RECIPE_ALLOWLIST } from "../../../../app/features/submit/flow-rules/recipes"
import { type FlowStep, isSubmissionEndpoint } from "../../../../app/schemas/submit"
import { arbSubmission } from "../../arbitraries/submission"

const RUNS = { numRuns: 2000 }

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
    // spatial recipe は default companion を維持する: spatial entry は gea (非 jga) に route され companion に含まれる
    for (const e of submission.fileEntries) {
      if (!isSpatialKind(e.fileTypeKind)) continue
      expect(tier2Ids.has(e.id)).toBe(true)
    }
  },
)

test.prop([arbSubmission], RUNS)(
  "deriveFlowSteps_recipeApplied_everyEntryLandsInSomeEndpoint",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    const endpointIds = entryIdsWhere(steps, (s) => isSubmissionEndpoint(s.service))
    // recipe 適用後も全 entry が宙に浮かない (no-orphan-destination を recipe 出力でも維持)
    for (const e of submission.fileEntries) {
      expect(endpointIds.has(e.id)).toBe(true)
    }
  },
)
