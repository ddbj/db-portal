import { fc, test } from "@fast-check/vitest"
import { expect } from "vitest"

import { detectRecipeGroups } from "../../../../app/features/submit/flow-rules/recipes"
import { magProjectSteps } from "../../../../app/features/submit/flow-rules/recipes/mag-project"
import { sagSteps } from "../../../../app/features/submit/flow-rules/recipes/sag"
import {
  type FileEntry,
  type FileGroup,
  type FlowStep,
  type Submission,
} from "../../../../app/schemas/submit"

const RUNS = { numRuns: 1000 }

// assembly-form 値の組み合わせで mag-sag-chain group を構築する。
// classify はチップに含まれる form だけで raw / primary|binned / mag / sag / その他を振り分けるため、
// ここでは「どの form チップを付けるか」だけを生成して残りのフィールドは固定する。
const MAG_FORMS = ["raw", "primary", "binned", "mag", "hybrid"] as const
const SAG_FORMS = ["raw", "sag", "hybrid"] as const
const ALL_FORMS = ["raw", "primary", "binned", "mag", "sag", "hybrid"] as const

type FormChoice = readonly string[]

const arbMagMemberForms: fc.Arbitrary<FormChoice> = fc.subarray([...MAG_FORMS], { minLength: 0, maxLength: 3 })
const arbSagMemberForms: fc.Arbitrary<FormChoice> = fc.subarray([...SAG_FORMS], { minLength: 0, maxLength: 2 })
// dispatch の優先順位 (mag > sag) と「どちらの form も無い」 を全て突くため全 vocab から引く
const arbAnyMemberForms: fc.Arbitrary<FormChoice> = fc.subarray([...ALL_FORMS], { minLength: 0, maxLength: 3 })

const chipsOf = (forms: FormChoice) =>
  forms.map((value) => ({ axis: "assembly-form" as const, value }))

const makeEntry = (id: string, groupId: string, forms: FormChoice): FileEntry => ({
  id,
  fileTypeKind: "sequence-read",
  filename: "",
  access: "open",
  dataForm: "raw",
  groupId,
  chipTags: chipsOf(forms),
})

// member の form 集合から、1 group ぶんの mag-sag-chain Submission を組み立てる。
const buildSubmission = (
  groupType: "mag-sag-chain",
  groupId: string,
  memberForms: readonly FormChoice[],
): { submission: Submission; group: FileGroup } => {
  const entries = memberForms.map((forms, i) => makeEntry(`${groupId}-e${i}`, groupId, forms))
  const group: FileGroup = {
    id: groupId,
    groupType,
    memberFileIds: entries.map((e) => e.id),
    linkedGroupIds: [],
  }
  const submission: Submission = {
    preconditions: { q1: null, q2: null },
    fileEntries: entries,
    fileGroups: [group],
    notes: "",
  }

  return { submission, group }
}

const arbMagGroup = fc
  .array(arbMagMemberForms, { minLength: 1, maxLength: 6 })
  .map((memberForms) => buildSubmission("mag-sag-chain", "gmag", memberForms))

const arbSagGroup = fc
  .array(arbSagMemberForms, { minLength: 1, maxLength: 6 })
  .map((memberForms) => buildSubmission("mag-sag-chain", "gsag", memberForms))

const formsOf = (entry: FileEntry): string[] =>
  entry.chipTags.filter((c) => c.axis === "assembly-form").map((c) => c.value)

const stepsByService = (steps: readonly FlowStep[], service: string): FlowStep[] =>
  steps.filter((s) => s.service === service)

const entryIdsOf = (steps: readonly FlowStep[]): Set<string> => {
  const ids = new Set<string>()
  for (const s of steps) for (const id of s.scope.entryIds) ids.add(id)

  return ids
}

const stepById = (steps: readonly FlowStep[], idSuffix: string): FlowStep | undefined =>
  steps.find((s) => s.id.endsWith(idSuffix))

// classify (mag-project) と同じ分類で member を 3 段に割る
const classifyMag = (members: readonly FileEntry[]) => {
  const raw: FileEntry[] = []
  const analysis: FileEntry[] = []
  const mag: FileEntry[] = []
  for (const e of members) {
    const forms = formsOf(e)
    if (forms.includes("mag")) mag.push(e)
    else if (forms.includes("primary") || forms.includes("binned")) analysis.push(e)
    else raw.push(e)
  }

  return { raw, analysis, mag }
}

// classify (sag) と同じ分類で member を生リードと SAG 配列に割る
const classifySag = (members: readonly FileEntry[]) => {
  const raw: FileEntry[] = []
  const sequence: FileEntry[] = []
  for (const e of members) {
    if (formsOf(e).includes("raw")) raw.push(e)
    else sequence.push(e)
  }

  return { raw, sequence }
}

// --- mag-project -----------------------------------------------------------

test.prop([arbMagGroup], RUNS)(
  "magProjectSteps_anyGroup_emitsExactlyOneBioprojectCoveringWholeGroup",
  ({ submission, group }) => {
    const steps = magProjectSteps(submission, [group])
    const bp = stepsByService(steps, "bioproject")
    expect(bp).toHaveLength(1)
    // 単一 BioProject は group 全 member を scope に持つ (全 4 stage が同じ BP を共有する形)
    const allEntryIds = submission.fileEntries.map((e) => e.id).sort()
    expect([...bp[0]!.scope.entryIds].sort()).toEqual(allEntryIds)
    expect(bp[0]!.scope.groupIds).toEqual([group.id])
  },
)

test.prop([arbMagGroup], RUNS)(
  "magProjectSteps_anyGroup_emitsAllFourBaseStages",
  ({ submission, group }) => {
    const steps = magProjectSteps(submission, [group])
    // bioproject / biosample(metagenome) / biosample(mag) / ddbj-trad は member 構成に依らず常に存在する
    for (const suffix of ["bioproject", "biosample-metagenome", "biosample-mag", "ddbj-trad"]) {
      expect(stepById(steps, suffix), `missing ${suffix}`).toBeDefined()
    }
  },
)

test.prop([arbMagGroup], RUNS)(
  "magProjectSteps_anyGroup_binnedAndMagDeriveFromMetagenomeRadially",
  ({ submission, group }) => {
    const members = submission.fileEntries
    const { raw, analysis, mag } = classifyMag(members)
    const steps = magProjectSteps(submission, [group])

    const metagenome = stepById(steps, "biosample-metagenome")!
    const magStep = stepById(steps, "biosample-mag")!
    const binnedStep = stepById(steps, "biosample-binned")

    const metaIds = new Set(metagenome.scope.entryIds)
    const magIds = new Set(magStep.scope.entryIds)

    // metagenome サンプル = 生リード (無ければ group 全体)。これが共通の親
    const expectedMeta = new Set((raw.length > 0 ? raw : members).map((e) => e.id))
    expect(metaIds).toEqual(expectedMeta)
    expect(magIds).toEqual(new Set(mag.map((e) => e.id)))

    // 放射状: binned / mag は metagenome を親に持つが互いを参照しない (scope が重ならない)
    if (binnedStep) {
      const binnedIds = new Set(binnedStep.scope.entryIds)
      expect(binnedIds).toEqual(new Set(analysis.map((e) => e.id)))
      for (const id of binnedIds) expect(magIds.has(id)).toBe(false)
    }
    // 親 (metagenome=raw) と子 (mag, binned=analysis) の分類は素な分割
    for (const id of magIds) expect(metaIds.has(id) && raw.length > 0).toBe(false)
  },
)

test.prop([arbMagGroup], RUNS)(
  "magProjectSteps_anyGroup_draAndDdbjTradEntryScopesAreDisjoint",
  ({ submission, group }) => {
    const steps = magProjectSteps(submission, [group])
    // (1) raw run / (2) analysis / (3) ... は dra へ、(4) MAG は ddbj-trad へ排他的に流れる
    const draIds = entryIdsOf(stepsByService(steps, "dra"))
    const tradIds = entryIdsOf(stepsByService(steps, "ddbj-trad"))
    for (const id of draIds) expect(tradIds.has(id)).toBe(false)
    for (const id of tradIds) expect(draIds.has(id)).toBe(false)

    const { raw, analysis, mag } = classifyMag(submission.fileEntries)
    expect(draIds).toEqual(new Set([...raw, ...analysis].map((e) => e.id)))
    expect(tradIds).toEqual(new Set(mag.map((e) => e.id)))
  },
)

test.prop([arbMagGroup], RUNS)(
  "magProjectSteps_anyGroup_draRunExistsIffRawReadsPresent",
  ({ submission, group }) => {
    const steps = magProjectSteps(submission, [group])
    const { raw, analysis } = classifyMag(submission.fileEntries)
    expect(stepById(steps, "dra-run") !== undefined).toBe(raw.length > 0)
    expect(stepById(steps, "dra-analysis") !== undefined).toBe(analysis.length > 0)
    expect(stepById(steps, "biosample-binned") !== undefined).toBe(analysis.length > 0)
  },
)

// --- sag -------------------------------------------------------------------

test.prop([arbSagGroup], RUNS)(
  "sagSteps_anyGroup_emitsExactlyOneBioprojectCoveringWholeGroup",
  ({ submission, group }) => {
    const steps = sagSteps(submission, [group])
    const bp = stepsByService(steps, "bioproject")
    expect(bp).toHaveLength(1)
    const allEntryIds = submission.fileEntries.map((e) => e.id).sort()
    expect([...bp[0]!.scope.entryIds].sort()).toEqual(allEntryIds)
    expect(bp[0]!.scope.groupIds).toEqual([group.id])
  },
)

test.prop([arbSagGroup], RUNS)(
  "sagSteps_anyGroup_combinedSagStepExistsIffAtLeastTwoIndividualSagMembers",
  ({ submission, group }) => {
    const steps = sagSteps(submission, [group])
    const { sequence } = classifySag(submission.fileEntries)
    // 結合 SAG サンプルは個別 SAG (sequence) が 2 件以上あるときのみ emit される
    expect(stepById(steps, "biosample-combined") !== undefined).toBe(sequence.length >= 2)
  },
)

test.prop([arbSagGroup], RUNS)(
  "sagSteps_anyGroup_misagAndCombinedConvergeOnWholeGroup",
  ({ submission, group }) => {
    const steps = sagSteps(submission, [group])
    const allEntryIds = new Set(submission.fileEntries.map((e) => e.id))

    // 収束 derived_from: MISAG / 結合 SAG biosample は group 全 member を 1 点に集約する
    const misag = stepById(steps, "biosample-misag")!
    expect(new Set(misag.scope.entryIds)).toEqual(allEntryIds)

    const combined = stepById(steps, "biosample-combined")
    if (combined) expect(new Set(combined.scope.entryIds)).toEqual(allEntryIds)
  },
)

test.prop([arbSagGroup], RUNS)(
  "sagSteps_anyGroup_draRunExistsIffRawReadsPresent",
  ({ submission, group }) => {
    const steps = sagSteps(submission, [group])
    const { raw } = classifySag(submission.fileEntries)
    expect(stepById(steps, "dra-run") !== undefined).toBe(raw.length > 0)
  },
)

// --- dispatch (mag-sag-chain → mag-project / sag, 排他) ---------------------

test.prop([fc.array(arbAnyMemberForms, { minLength: 1, maxLength: 4 })], RUNS)(
  "detectRecipeGroups_magSagChain_dispatchesToAtMostOneRecipeNeverBoth",
  (memberForms) => {
    const { submission, group } = buildSubmission("mag-sag-chain", "gx", memberForms)
    const { magGroups, sagGroups } = detectRecipeGroups(submission)
    const inMag = magGroups.some((g) => g.id === group.id)
    const inSag = sagGroups.some((g) => g.id === group.id)
    // 同一 group が両 recipe に入ることはない
    expect(inMag && inSag).toBe(false)

    const hasMag = submission.fileEntries.some((e) => formsOf(e).includes("mag"))
    const hasSag = submission.fileEntries.some((e) => formsOf(e).includes("sag"))
    // mag チップがあれば mag-project に dispatch (sag より優先)
    if (hasMag) {
      expect(inMag).toBe(true)
      expect(inSag).toBe(false)
    } else if (hasSag) {
      expect(inSag).toBe(true)
      expect(inMag).toBe(false)
    } else {
      // どちらの form も無い group はどちらの recipe にも入らない
      expect(inMag).toBe(false)
      expect(inSag).toBe(false)
    }
  },
)

test.prop([fc.array(arbMagMemberForms, { minLength: 0, maxLength: 0 })], RUNS)(
  "detectRecipeGroups_emptyMagSagChain_dispatchesToNeitherRecipe",
  () => {
    const submission: Submission = {
      preconditions: { q1: null, q2: null },
      fileEntries: [],
      fileGroups: [{ id: "gempty", groupType: "mag-sag-chain", memberFileIds: [], linkedGroupIds: [] }],
      notes: "",
    }
    const { magGroups, sagGroups } = detectRecipeGroups(submission)
    expect(magGroups).toHaveLength(0)
    expect(sagGroups).toHaveLength(0)
  },
)
