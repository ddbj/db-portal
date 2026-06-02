import { fc, test } from "@fast-check/vitest"
import { expect } from "vitest"

import { deriveFlowSteps } from "../../../../app/features/submit/flow-rules"
import {
  detectRecipeGroups,
  RECIPE_ALLOWLIST,
} from "../../../../app/features/submit/flow-rules/recipes"
import {
  type FileGroup,
  type FlowStep,
  isDestinationService,
  isSubmissionEndpoint,
  type Submission,
} from "../../../../app/schemas/submit"
import { arbSubmission } from "../../arbitraries/submission"

const RUNS = { numRuns: 2000 }

// 名前付き recipe (mag / sag / jga) が所有するグループと entry を確定する。
// derive-flow-steps と同じ規約: recipe-owned entry は Tier1/Tier2 companion から除外される。
const recipeGroupIds = (submission: Submission): Set<string> => {
  const { magGroups, sagGroups } = detectRecipeGroups(submission)

  return new Set([...magGroups, ...sagGroups].map((g) => g.id))
}

const recipeOwnedEntryIds = (submission: Submission): Set<string> => {
  const gids = recipeGroupIds(submission)

  return new Set(submission.fileEntries.filter((e) => gids.has(e.groupId)).map((e) => e.id))
}

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

// jga-dataset group に実在しない linkedGroupId を注入する。
// jgaSubmissionSteps は linkedGroupId を「同一 Dataset に束ねる group 参照」として読むので、
// dangling 参照を渡しても throw せず単に無視されることを固定する。
const arbSubmissionWithDanglingLinks: fc.Arbitrary<Submission> = arbSubmission.map(
  (submission): Submission => {
    const realIds = new Set(submission.fileGroups.map((g) => g.id))
    let n = 0
    const danglingId = (): string => {
      let id = `g-dangling-${n++}`
      while (realIds.has(id)) id = `g-dangling-${n++}`

      return id
    }
    const fileGroups: FileGroup[] = submission.fileGroups.map((g) =>
      g.groupType === "jga-dataset"
        ? { ...g, linkedGroupIds: [...g.linkedGroupIds, danglingId()] }
        : g,
    )

    // JGA 分岐は access=restricted ∧ q2=human が前提なので、jga recipe が実際に発火する
    // 状態へ寄せて dangling 参照を必ず通過させる。
    return {
      ...submission,
      preconditions: { q1: "restricted", q2: "human" },
      fileGroups,
    }
  },
)

test.prop([arbSubmission], RUNS)(
  "RECIPE_ALLOWLIST_anySubmission_isImmutableAndAllRecipeStepIdsTraceToAllowlist",
  (submission) => {
    // allowlist は frozen に近い不変集合として扱う規約: 重複なし・空でない
    expect(new Set(RECIPE_ALLOWLIST).size).toBe(RECIPE_ALLOWLIST.length)
    expect(RECIPE_ALLOWLIST.length).toBeGreaterThan(0)
    // recipe 由来の step は必ず allowlist のいずれかのプレフィックスを持つ
    const allowedPrefixes = ["recipe-jga", "recipe-mag", "recipe-sag", "recipe-spatial"]
    for (const s of recipeSteps(deriveFlowSteps(submission))) {
      expect(allowedPrefixes.some((p) => s.id.startsWith(p))).toBe(true)
    }
  },
)

test.prop([arbSubmission], RUNS)(
  "deriveFlowSteps_recipeOwnedGroup_emitsExactlyOneBioprojectPerGroupAndNeverSplits",
  (submission) => {
    const { magGroups, sagGroups } = detectRecipeGroups(submission)
    fc.pre(magGroups.length + sagGroups.length > 0)
    const steps = deriveFlowSteps(submission)
    for (const g of [...magGroups, ...sagGroups]) {
      const bioForGroup = steps.filter(
        (s) =>
          s.origin === "recipe"
          && s.service === "bioproject"
          && s.id.endsWith(`-${g.id}-bioproject`),
      )
      // recipe は 1 group の BioProject を分割しない: ちょうど 1 枚
      expect(bioForGroup).toHaveLength(1)
    }
  },
)

test.prop([arbSubmission], RUNS)(
  "deriveFlowSteps_recipeOwnedEntries_excludedFromTier2CompanionScope",
  (submission) => {
    const owned = recipeOwnedEntryIds(submission)
    fc.pre(owned.size > 0)
    const steps = deriveFlowSteps(submission)
    // Tier2 companion (tier2-bioproject / tier2-biosample) は recipe-owned entry を含まない。
    // recipe が自前で BioProject/BioSample を立てるため、companion 側に二重計上されない。
    for (const s of steps) {
      if (s.origin !== "tier2") continue
      for (const id of s.scope.entryIds) {
        expect(owned.has(id)).toBe(false)
      }
    }
  },
)

test.prop([arbSubmission], RUNS)(
  "deriveFlowSteps_recipeOwnedEntry_landsInSomeSubmissionEndpoint",
  (submission) => {
    const owned = recipeOwnedEntryIds(submission)
    fc.pre(owned.size > 0)
    const steps = deriveFlowSteps(submission)
    const endpointIds = entryIdsWhere(steps, (s) => isSubmissionEndpoint(s.service))
    // recipe が所有した entry は宙に浮かない: 必ずどこかの登録エンドポイント step に現れる
    for (const id of owned) {
      expect(endpointIds.has(id)).toBe(true)
    }
  },
)

test.prop([arbSubmission], RUNS)(
  "deriveFlowSteps_anyEntry_notRoutedToBothJgaAndDra",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    const jgaIds = entryIdsWhere(steps, (s) => s.service === "jga")
    const draIds = entryIdsWhere(steps, (s) => s.service === "dra")
    // jga と dra は排他の登録先 (制限ヒト個人 vs それ以外)。同一 entry が両方に route されない
    for (const id of jgaIds) {
      expect(draIds.has(id)).toBe(false)
    }
  },
)

test.prop([arbSubmission], RUNS)(
  "deriveFlowSteps_recipeDestinationStep_scopeGroupIdsAreEntryCarriedOrRealGroups",
  (submission) => {
    const realGroups = new Set(submission.fileGroups.map((g) => g.id))
    const entryGroupIds = new Set(submission.fileEntries.map((e) => e.groupId))
    const steps = deriveFlowSteps(submission)
    for (const s of recipeSteps(steps)) {
      if (!isDestinationService(s.service)) continue
      // recipe destination step が指す group は実在 group か、いずれかの entry が現に持つ
      // groupId のみ。recipe が独自の合成 group id を発明しないことを固定する。
      for (const gid of s.scope.groupIds) {
        expect(realGroups.has(gid) || entryGroupIds.has(gid)).toBe(true)
      }
    }
  },
)

test.prop([arbSubmissionWithDanglingLinks], RUNS)(
  "deriveFlowSteps_jgaDatasetWithDanglingLinkedGroupId_doesNotLeakDanglingIdIntoScope",
  (submission) => {
    const realGroups = new Set(submission.fileGroups.map((g) => g.id))
    // dangling linkedGroupId を持つ jga-dataset group が存在する前提
    fc.pre(
      submission.fileGroups.some(
        (g) =>
          g.groupType === "jga-dataset"
          && g.linkedGroupIds.some((id) => !realGroups.has(id)),
      ),
    )
    const steps = deriveFlowSteps(submission)
    // 出力 step の groupIds に dangling 参照が漏れない (linkedGroupId は entry 束ねの参照に留まる)
    for (const s of steps) {
      for (const gid of s.scope.groupIds) {
        expect(realGroups.has(gid)).toBe(true)
      }
    }
  },
)

test.prop([arbSubmissionWithDanglingLinks], RUNS)(
  "deriveFlowSteps_jgaDatasetWithDanglingLinkedGroupId_jgaEntriesStillLandInPolicyStep",
  (submission) => {
    const realGroups = new Set(submission.fileGroups.map((g) => g.id))
    fc.pre(
      submission.fileGroups.some(
        (g) =>
          g.groupType === "jga-dataset"
          && g.linkedGroupIds.some((id) => !realGroups.has(id)),
      ),
    )
    const steps = deriveFlowSteps(submission)
    const jgaIds = entryIdsWhere(steps, (s) => s.service === "jga")
    fc.pre(jgaIds.size > 0)
    // dangling 参照があっても、JGA に route された entry はすべて Policy 前提 step (humandbs) に集約される。
    const policyStep = steps.find((s) => s.id === "recipe-jga-policy")
    expect(policyStep).toBeDefined()
    const policyIds = new Set(policyStep!.scope.entryIds)
    for (const id of jgaIds) {
      expect(policyIds.has(id)).toBe(true)
    }
  },
)
