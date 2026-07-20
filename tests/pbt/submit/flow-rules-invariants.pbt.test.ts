import { fc, test } from "@fast-check/vitest"
import { expect } from "vitest"

import { deriveAccess, requiresHumandbsApplication } from "../../../app/features/submit/access"
import { isKindEnabled } from "../../../app/features/submit/cascade"
import { deriveFlowSteps } from "../../../app/features/submit/flow-rules"
import {
  type FileEntry,
  type FlowStep,
  IDENTIFIABLE_KINDS,
  isCompanionService,
  isSequencingSpatialPlatform,
  isSubmissionEndpoint,
  SERVICE_DEPENDENCIES,
  SERVICE_DEPENDENCY_ORDER,
  type Submission,
} from "../../../app/schemas/submit"
import { arbAccessSection, arbFileTypeKind, arbOrganismDomain, arbSubmission } from "../arbitraries/submission"

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
  isKindEnabled(submission.preconditions.organismDomain, e.fileTypeKind)

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

// step の service が BP/BS を依存宣言している (= DDBJ 内 companion が必要な destination) か
const requiresCompanion = (s: FlowStep): boolean => {
  if (isCompanionService(s.service)) return false
  const deps = SERVICE_DEPENDENCIES[s.service]
  return deps.includes("bioproject") || deps.includes("biosample")
}

// companion は Tier1 の primary routing (= ユーザーが選んだ種別の主登録先) に対して付与する。
// recipe (jgaSubmissionSteps / expressionDraSteps 等) が追加する副次 step は、そのカード自身の依存宣言に
// 関わらず companion 生成の起点にはならない (jga 制御下の raw DRA に DDBJ 側 BP/BS を要求しない等)。
const isTier1CompanionSource = (s: FlowStep): boolean => s.origin === "tier1" && requiresCompanion(s)

test.prop([arbSubmission], RUNS)(
  "deriveFlowSteps_hasCompanionRequiringTier1Step_yieldsExactlyOneBioprojectAndBiosample",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    // Tier1 で BP/BS 依存を持つ service を emit する step が 1 つでも実在するときだけ既定 companion が出る
    fc.pre(steps.some(isTier1CompanionSource))
    expect(steps.filter((s) => s.service === "bioproject")).toHaveLength(1)
    expect(steps.filter((s) => s.service === "biosample")).toHaveLength(1)
  },
)

test.prop([arbSubmission], RUNS)(
  "deriveFlowSteps_noCompanionRequiringTier1Step_yieldsNoBioprojectOrBiosample",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    // step は生成されたが、Tier1 で BP/BS 依存を宣言する service が 1 つも無いフロー
    // (例: proteome → jpost only、非ヒト variant → eva only、humandbs+jga+recipe-dra のみ) では companion を出さない
    fc.pre(steps.length > 0)
    fc.pre(!steps.some(isTier1CompanionSource))
    expect(steps.filter((s) => s.service === "bioproject")).toHaveLength(0)
    expect(steps.filter((s) => s.service === "biosample")).toHaveLength(0)
  },
)

test.prop([arbSubmission], RUNS)(
  "deriveFlowSteps_sequenceRead_partitionsByJgaOrDraExclusively",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    const jgaIds = entryIdsOfService(steps, (s) => s.service === "jga")
    const draIds = entryIdsOfService(steps, (s) => s.service === "dra")
    const organismDomain = submission.preconditions.organismDomain
    for (const e of submission.fileEntries) {
      if (e.fileTypeKind !== "sequence-read") continue
      if (!isActive(submission, e)) continue
      // JGA はヒト個人のみ。restricted でも非ヒト (metagenome 含む) は DRA(embargo) に行く
      const toJga = e.access === "restricted" && organismDomain === "human"
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
  "deriveFlowSteps_requiresHumandbsApplication_yieldsExactlyOneHumandbsStep",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    fc.pre(steps.length > 0)
    fc.pre(requiresHumandbsApplication(submission.preconditions.organismDomain, submission.accessSection))
    // 指針対象 (ヒト × ethicsCompliance/hasIdentifier/restrictedPreference のいずれか) では
    // destination が JGA でも非 JGA でも humandbs 前提ゲートが 1 枚出る
    expect(steps.filter((s) => s.service === "humandbs")).toHaveLength(1)
  },
)

test.prop([arbSubmission], RUNS)(
  "deriveFlowSteps_notRequiresHumandbsApplication_yieldsNoHumandbsStep",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    fc.pre(!requiresHumandbsApplication(submission.preconditions.organismDomain, submission.accessSection))
    // 指針対象外 (非ヒト、 または publiclyAvailable / microbialAnalysis のみ ON) では humandbs は出ない
    expect(steps.some((s) => s.service === "humandbs")).toBe(false)
  },
)

test.prop([arbSubmission], RUNS)(
  "deriveFlowSteps_spatialGroupKind_stepCoversWholeGroup",
  (submission) => {
    const steps = deriveFlowSteps(submission)
    const jgaIds = entryIdsOfService(steps, (s) => s.service === "jga")
    const isSpatial = (k: string) => k === "spatial-transcriptomics"
    for (const e of submission.fileEntries) {
      if (!isSpatial(e.fileTypeKind)) continue
      if (!isActive(submission, e)) continue
      if (jgaIds.has(e.id)) continue
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
    const jgaIds = entryIdsOfService(steps, (s) => s.service === "jga")
    const isSpatial = (k: string) => k === "spatial-transcriptomics"
    for (const e of submission.fileEntries) {
      if (!isSpatial(e.fileTypeKind)) continue
      if (!isActive(submission, e)) continue
      if (jgaIds.has(e.id)) continue
      const sequencing = e.chipTags.some(
        (c) => c.axis === "spatial-platform" && isSequencingSpatialPlatform(c.value),
      )
      expect(geaIds.has(e.id)).toBe(true)
      expect(draIds.has(e.id)).toBe(sequencing)
    }
  },
)

test.prop([arbOrganismDomain, arbAccessSection, arbFileTypeKind], RUNS)(
  "deriveAccess_consistency_matchesPriorityChain",
  (organismDomain, accessSection, kind) => {
    const access = deriveAccess(organismDomain, accessSection, kind)
    if (organismDomain !== "human") {
      expect(access).toBe("open")
    } else if (accessSection.restrictedPreference) {
      expect(access).toBe("restricted")
    } else if (accessSection.hasIdentifier) {
      expect(access).toBe("restricted")
    } else if (accessSection.ethicsCompliance) {
      expect(access).toBe(IDENTIFIABLE_KINDS.has(kind) ? "restricted" : "open")
    } else if (accessSection.publiclyAvailable || accessSection.microbialAnalysis) {
      expect(access).toBe("open")
    } else {
      expect(access).toBe("restricted")
    }
  },
)

test.prop([arbOrganismDomain, arbAccessSection, arbFileTypeKind], RUNS)(
  "deriveAccess_chipNonIdentifiable_flipsToOpen_whenIdentifierAssumed",
  (organismDomain, accessSection, kind) => {
    const chips = [{ axis: "identifiability" as const, value: "non-identifiable" }]
    const access = deriveAccess(organismDomain, accessSection, kind, chips)
    if (organismDomain !== "human") {
      expect(access).toBe("open")
    } else if (accessSection.restrictedPreference) {
      expect(access).toBe("restricted")
    } else if (accessSection.hasIdentifier) {
      expect(access).toBe("open")
    } else if (accessSection.ethicsCompliance) {
      expect(access).toBe("open")
    } else if (accessSection.publiclyAvailable || accessSection.microbialAnalysis) {
      expect(access).toBe("open")
    } else {
      expect(access).toBe("restricted")
    }
  },
)

test.prop([arbOrganismDomain, arbAccessSection, arbFileTypeKind], RUNS)(
  "deriveAccess_chipIdentifiable_flipsToRestricted_whenIdentifierDenied",
  (organismDomain, accessSection, kind) => {
    const chips = [{ axis: "identifiability" as const, value: "identifiable" }]
    const access = deriveAccess(organismDomain, accessSection, kind, chips)
    if (organismDomain !== "human") {
      expect(access).toBe("open")
    } else if (accessSection.restrictedPreference) {
      expect(access).toBe("restricted")
    } else if (accessSection.hasIdentifier) {
      expect(access).toBe("restricted")
    } else if (accessSection.ethicsCompliance) {
      expect(access).toBe("restricted")
    } else if (accessSection.publiclyAvailable || accessSection.microbialAnalysis) {
      expect(access).toBe("restricted")
    } else {
      expect(access).toBe("restricted")
    }
  },
)
