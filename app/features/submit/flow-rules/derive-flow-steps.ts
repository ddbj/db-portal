import { type FileEntry, type FlowStep, isDestinationService, type Service, type Submission } from "~/schemas/submit"

import { type EntryRouting, routeEntries } from "./interpreter"
import { ENGINE_MESSAGE_KEYS as MK } from "./messages"
import { byServiceDependencyOrder } from "./ordering"
import { detectRecipeGroups, jgaSubmissionSteps, magProjectSteps, sagSteps, spatialSteps } from "./recipes"
import { dedupeNotes, groupMembers, makeStep, mergeScopes, scopeOfEntries } from "./shared"

// 薄インタプリタ: 同一 service の per-entry routing を 1 枚にまとめる
const buildTier1Steps = (routings: readonly EntryRouting[]): FlowStep[] => {
  const byService = new Map<Service, EntryRouting[]>()
  for (const r of routings) {
    const bucket = byService.get(r.service) ?? []
    bucket.push(r)
    byService.set(r.service, bucket)
  }

  return [...byService.entries()].map(([service, rs]) =>
    makeStep(`tier1-${service}`, service, "tier1", mergeScopes(rs.map((r) => r.scope)), rs.flatMap((r) => r.notes)),
  )
}

// 既定 companion: entry が 1 つでもあれば bioproject 1 + biosample 1 (recipe scope の entry を除く)
const companionSteps = (entries: readonly FileEntry[]): FlowStep[] => {
  if (entries.length === 0) return []
  const scope = scopeOfEntries(entries)

  return [
    makeStep("tier2-bioproject", "bioproject", "tier2", scope, [
      { kind: "info", messageKey: MK.bioprojectIntro },
    ]),
    makeStep("tier2-biosample", "biosample", "tier2", scope, [
      { kind: "info", messageKey: MK.biosampleIntro },
    ]),
  ]
}

const MULTIMODAL_EXCLUDED: ReadonlySet<string> = new Set([
  "assembly-annotation",
  "mag-sag-chain",
  "jga-dataset",
])

// 1 group に複数 FileTypeKind が混在する (意図的な多種別 group は除外)
const mixedGroupIds = (submission: Submission): Set<string> => {
  const ids = new Set<string>()
  for (const g of submission.fileGroups) {
    if (MULTIMODAL_EXCLUDED.has(g.groupType)) continue
    const kinds = new Set(groupMembers(submission, g.id).map((e) => e.fileTypeKind))
    if (kinds.size >= 2) ids.add(g.id)
  }

  return ids
}

const decorateMultiModal = (steps: readonly FlowStep[], submission: Submission): FlowStep[] => {
  const gids = mixedGroupIds(submission)
  if (gids.size === 0) return [...steps]
  const entryIds = new Set(
    submission.fileEntries.filter((e) => gids.has(e.groupId)).map((e) => e.id),
  )

  return steps.map((s) => {
    if (!isDestinationService(s.service)) return s
    const touches = s.scope.groupIds.some((g) => gids.has(g))
      || s.scope.entryIds.some((id) => entryIds.has(id))
    if (!touches) return s

    return {
      ...s,
      notes: dedupeNotes([...s.notes, { kind: "warning", messageKey: MK.multiModalWarning }]),
    }
  })
}

// 薄インタプリタ (Tier1) と Tier2 構造エンジン / named recipe を合成して FlowStep[] を返す (副作用なし)
export const deriveFlowSteps = (submission: Submission): FlowStep[] => {
  if (submission.fileEntries.length === 0) return []

  const { magGroups, sagGroups } = detectRecipeGroups(submission)
  const recipeGroupIds = new Set([...magGroups, ...sagGroups].map((g) => g.id))
  const recipeOwned = new Set(
    submission.fileEntries.filter((e) => recipeGroupIds.has(e.groupId)).map((e) => e.id),
  )

  const plainEntries = submission.fileEntries.filter((e) => !recipeOwned.has(e.id))
  const routings = routeEntries(submission, plainEntries)
  const jgaEntries = routings.filter((r) => r.service === "jga").map((r) => r.entry)
  const plainRoutings = routings.filter((r) => r.service !== "jga")

  const steps: FlowStep[] = [
    ...buildTier1Steps(plainRoutings),
    ...companionSteps(plainRoutings.map((r) => r.entry)),
    ...jgaSubmissionSteps(submission, jgaEntries),
    ...magProjectSteps(submission, magGroups),
    ...sagSteps(submission, sagGroups),
    ...spatialSteps(plainEntries),
  ]

  return [...decorateMultiModal(steps, submission)].sort(byServiceDependencyOrder)
}
