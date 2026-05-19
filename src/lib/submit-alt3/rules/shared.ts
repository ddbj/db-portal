// submit-alt3 flow rule 共通 helper
// SSOT: docs/submit-alt3-data-model.md §4.6
// 各 rule ファイルから import される純粋関数群。副作用なし、Submission を引数で受け取る。

import {
  getChipValue,
  SERVICE_ACCESSION_TYPES,
} from "@/lib/mock-data/submit-alt3"
import {
  type ChipAxis,
  EXTERNAL_SERVICES,
  type FileEntry,
  type FileGroup,
  type FlowStep,
  type FlowWarning,
  type Organism,
  type ServiceKind,
  type Submission,
} from "@/types/submit-alt3"

// ----- Step 構築 helper -----

export const badgeKindOf = (service: ServiceKind): "internal" | "external" =>
  EXTERNAL_SERVICES.includes(service) ? "external" : "internal"

export const accessionTypesFor = (service: ServiceKind): string[] => [
  ...SERVICE_ACCESSION_TYPES[service],
]

// Step ID 命名規約 (§4.6.1)
// service 名 + 任意の discriminator (- 区切り)
export const makeStepId = (
  service: ServiceKind,
  discriminator?: string,
): string =>
  discriminator !== undefined && discriminator !== ""
    ? `step-${service}-${discriminator}`
    : `step-${service}`

// Step の skeleton を生成 (`title` は i18n key、`intraDbInputs` 等はデフォルト空)。
// 各 rule は本 helper を呼び、戻り値の Step を patch して push する。
// mergeKey は Service 単位 merge の同一性キー (docs/submit-alt3-flow-rules.md §8.1.A)。
// デフォルト = service 文字列。Rule 8/9/11 のように per-origin で Step を維持したい場合のみ明示指定する。
export const createStep = (params: {
  service: ServiceKind
  discriminator?: string
  mergeKey?: string
  targetGroupIds?: readonly string[]
  targetFileIds?: readonly string[]
  intraDbInputs?: Record<string, unknown>
  upstreamStepIds?: readonly string[]
  notes?: readonly string[]
  warnings?: readonly FlowWarning[]
  titleOverride?: string
}): FlowStep => {
  const {
    service,
    discriminator,
    mergeKey,
    targetGroupIds = [],
    targetFileIds = [],
    intraDbInputs = {},
    upstreamStepIds = [],
    notes = [],
    warnings = [],
    titleOverride,
  } = params

  return {
    id: makeStepId(service, discriminator),
    mergeKey: mergeKey ?? service,
    service,
    title: titleOverride ?? `flowSteps.${service}.title`,
    targetGroupIds: [...targetGroupIds],
    targetFileIds: [...targetFileIds],
    intraDbInputs,
    upstreamStepIds: [...upstreamStepIds],
    issuedAccessionTypes: accessionTypesFor(service),
    badgeKind: badgeKindOf(service),
    notes: [...notes],
    warnings: [...warnings],
  }
}

// serviceDrafts[stepId] と自動推測 intraDbInputs を merge して返す。
// auto を先に、user 入力を後に展開してユーザー入力が常に勝つ (data-model.md §4.4.2)。
export const mergeServiceDraft = (
  submission: Submission,
  stepId: string,
  autoInputs: Record<string, unknown>,
): Record<string, unknown> => ({
  ...autoInputs,
  ...submission.serviceDrafts[stepId],
})

// ----- ファイル / Group ナビゲーション helper -----

// FileGroup の memberFileIds を実体 FileEntry 配列に解決
export const getGroupMembers = (
  submission: Submission,
  group: FileGroup,
): FileEntry[] =>
  group.memberFileIds
    .map((id) => submission.fileEntries.find((f) => f.id === id))
    .filter((f): f is FileEntry => f !== undefined)

// 主 Group + additionalGroupIds で参照されている File を取り出す
export const getFilesReferencingGroup = (
  submission: Submission,
  groupId: string,
): FileEntry[] =>
  submission.fileEntries.filter(
    (f) =>
      f.groupId === groupId ||
      (f.additionalGroupIds ?? []).includes(groupId),
  )

// FileGroup を memberFileIds の最小 file 連番昇順で安定ソート
// (`_submission` 引数は将来 file 解決ルートを差し替える余地として残す)
export const sortGroupsByMinFileId = (
  _submission: Submission,
  groups: readonly FileGroup[],
): FileGroup[] =>
  [...groups].sort((a, b) => {
    const aMin = Math.min(
      ...a.memberFileIds.map((id) => parseFileSequence(id) ?? Infinity),
    )
    const bMin = Math.min(
      ...b.memberFileIds.map((id) => parseFileSequence(id) ?? Infinity),
    )

    return aMin - bMin
  })

const parseFileSequence = (id: string): number | undefined => {
  const m = id.match(/^file-(\d+)$/)

  return m ? Number(m[1]) : undefined
}

// ----- chip / 列 値の集約 helper -----

// 全 FileEntry のうち、未設定列を持つものがあるか (Rule 1 / orchestrator で global warning に使う)
export const hasUnsetColumn = (submission: Submission): boolean =>
  submission.fileEntries.some(
    (f) =>
      f.organism === undefined ||
      f.accessRestriction === undefined ||
      f.dataForm === undefined,
  )

// Submission に存在する organism 値の集合
export const organismsInSubmission = (
  submission: Submission,
): Organism[] => {
  const seen = new Set<Organism>()
  for (const f of submission.fileEntries) {
    if (f.organism !== undefined) seen.add(f.organism)
  }

  return Array.from(seen)
}

// 特定行が「特定 chip 軸 == 特定値」を持つか
export const fileHasChip = (
  file: FileEntry,
  axis: ChipAxis,
  value: string,
): boolean => getChipValue(file.chipTags, axis) === value

// 特定 chip 軸の値を取得 (なければ undefined)
export const fileChipValue = (
  file: FileEntry,
  axis: ChipAxis,
): string | undefined => getChipValue(file.chipTags, axis)
