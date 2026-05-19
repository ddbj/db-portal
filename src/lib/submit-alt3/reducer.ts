// submit-alt3 Submission reducer (Phase A 最小版)
// SSOT: docs/submit-alt3-data-model.md §4.4.1 / §4.4.3
// 純粋関数 (submission, action) => submission'。referential integrity (data-model.md §4.4.3) を維持する責務。
// Phase A: addFile (sequence-read の pair-end / single-end のみ) + editCell + dismissWarning + removeFile

import {
  ASSEMBLY_FORM_TO_FUNCTIONAL_GENOMICS,
  BUTTON_META,
  removeChip as removeChipFromArray,
  upsertChip,
} from "@/lib/mock-data/submit-alt3"
import type {
  AccessRestriction,
  AssemblyForm,
  BioProjectDraft,
  BioSampleDraft,
  ButtonType,
  ChipAxis,
  ChipTag,
  DataForm,
  FileEntry,
  FileGroup,
  FileRole,
  GroupType,
  Organism,
  ReferenceMeta,
  ServiceDraft,
  ServiceKind,
  Submission,
} from "@/types/submit-alt3"

// ----- Action 型 -----

export interface AddFilePayload {
  buttonType: ButtonType
  groupType: GroupType
  // ファイル名 + role (members の長さで複数ファイル Group になる)
  members: readonly { displayName: string; role: FileRole }[]
  // 初期 chip (modal で確定する非 grouping 属性)
  chipTags?: readonly ChipTag[]
  // dataForm の初期値上書き (デフォルト = BUTTON_META[buttonType].defaultDataForm)
  defaultDataForm?: DataForm
  // 個人特定 yes の場合に access=restricted を自動付与
  autoAccess?: AccessRestriction
  // Group 補助情報 (referenceMeta / notes / experimentTypeHint / metaboBankSubmissionType)
  groupOverrides?: {
    referenceMeta?: ReferenceMeta
    notes?: string
    experimentTypeHint?: string
    metaboBankSubmissionType?: string
  }
  // modal で「既存 BS と関連付け」を選んだ場合の対象 BS id (data-model §4.3.1)。
  // 新規 Group が既存 BS の sourceGroupIds に追加され、新規 BS は作られない。
  linkToBsId?: string
}

export type SubmissionAction =
  | { type: "add-file"; payload: AddFilePayload }
  | {
    type: "edit-cell"
    payload: {
      fileId: string
      column: "organism" | "accessRestriction" | "dataForm"
      value: Organism | AccessRestriction | DataForm | undefined
      source?: "user" | "auto"
    }
  }
  | { type: "remove-file"; payload: { fileId: string } }
  | {
    type: "set-chip"
    payload: {
      fileId: string
      axis: ChipAxis
      value: string | undefined
      manualOverride?: boolean
    }
  }
  | {
    type: "reset-chip-manual"
    payload: { fileId: string; axis: ChipAxis }
  }
  | {
    type: "update-group-reference-meta"
    payload: { groupId: string; referenceMeta: ReferenceMeta | undefined }
  }
  | { type: "dismiss-warning"; payload: { warningId: string } }
  | {
    // Step カード pulldown 入力 (Rule 14a / Rule 13) を serviceDrafts[stepId] に shallow merge
    type: "update-service-draft"
    payload: {
      stepId: string
      serviceKind: ServiceKind
      values: Record<string, unknown>
    }
  }
  | {
    // dismissedWarnings から特定 warning を消す (ユーザーが acknowledged を解除する用)
    type: "restore-warning"
    payload: { warningId: string }
  }

// ----- 内部 helper -----

const nextFileId = (submission: Submission, offset: number): string =>
  `file-${submission.fileSequence + offset}`

const nextGroupId = (submission: Submission): { id: string; sequence: number } => {
  const sequence = submission.groupSequence + 1

  return { id: `group-${sequence}`, sequence }
}

const buildFileEntry = (
  id: string,
  groupId: string,
  buttonType: ButtonType,
  displayName: string,
  role: FileRole,
  defaultDataForm: DataForm,
  chipTags: readonly ChipTag[],
): FileEntry => ({
  id,
  groupId,
  buttonType,
  displayName,
  role,
  dataForm: defaultDataForm,
  columnSource: { dataForm: "auto" },
  chipTags: [...chipTags],
})

// 全 FileEntry の (organism, dataForm, accessRestriction) 集合に基づき
// primary BP / BS の最小構成を再計算する。
//
// BS の集約:
// - 既定では 1 fileGroup = 1 BS。fileGroups の登場順を保ち、`existingBsByGroup` で既存 id を温存する。
// - `FileGroup.sourceBsHint` (data-model §4.3.1 「同 sample 関連付け」) が指定された Group は
//   新規 BS を作らず、対象 BS の `sourceGroupIds` に append される。
// - hint 先 BS が現存しない場合は単独 BS にフォールバック (referential integrity を破らない)。
const recomputeBpAndBs = (submission: Submission): Submission => {
  const { fileEntries, fileGroups } = submission

  if (fileEntries.length === 0) {
    // 全 Step が消えるので動的 step prefix を含む dismissedWarnings は全て cleanup
    // (固定 step prefix のみ残す。data-model §4.4.2)
    const survivingDismissed: Record<string, true> = {}
    for (const [warningId, value] of Object.entries(submission.dismissedWarnings)) {
      if (!isDynamicStepWarning(warningId)) survivingDismissed[warningId] = value
    }

    return {
      ...submission,
      primaryBioProjects: [],
      biosamples: [],
      dismissedWarnings: survivingDismissed,
    }
  }

  // 既存 BP / BS の id を温存 (data-model.md §4.4.1)
  const existingBp = submission.primaryBioProjects[0]
  const bpId = existingBp?.id ?? `bp-${submission.bpSequence + 1}`
  const bpSequenceConsumed = existingBp ? 0 : 1

  const derivedFromTags: BioProjectDraft["derivedFromTags"] = fileEntries.map(
    (f) => {
      const tag: BioProjectDraft["derivedFromTags"][number] = {}
      if (f.organism !== undefined) tag.organism = f.organism
      if (f.accessRestriction !== undefined) tag.accessRestriction = f.accessRestriction
      if (f.dataForm !== undefined) tag.dataForm = f.dataForm

      return tag
    },
  )

  const primaryBp: BioProjectDraft = {
    id: bpId,
    intraDbValues: existingBp?.intraDbValues ?? {},
    derivedFromTags,
  }

  // 既存 BS を groupId → BS、bsId → BS の 2 系統で索引
  const existingBsByGroup = new Map<string, BioSampleDraft>()
  const existingBsById = new Map<string, BioSampleDraft>()
  for (const bs of submission.biosamples) {
    existingBsById.set(bs.id, bs)
    for (const gid of bs.sourceGroupIds) {
      existingBsByGroup.set(gid, bs)
    }
  }

  // bsId → 集約された sourceGroupIds の蓄積バケツ
  const aggregated = new Map<string, { bs: BioSampleDraft; sourceGroupIds: string[] }>()
  // 出力順序を fileGroups の登場順に固定する用
  const orderedBsIds: string[] = []
  let nextBsSequenceConsumed = 0

  const pushAggregation = (bs: BioSampleDraft, groupId: string): void => {
    const found = aggregated.get(bs.id)
    if (found) {
      if (!found.sourceGroupIds.includes(groupId)) {
        found.sourceGroupIds.push(groupId)
      }

      return
    }
    aggregated.set(bs.id, { bs, sourceGroupIds: [groupId] })
    orderedBsIds.push(bs.id)
  }

  for (const g of fileGroups) {
    // sourceBsHint が指す既存 BS にぶら下げる (data-model §4.3.1)
    const hintTarget = g.sourceBsHint !== undefined
      ? existingBsById.get(g.sourceBsHint)
      : undefined
    if (hintTarget) {
      pushAggregation(hintTarget, g.id)
      continue
    }

    const existing = existingBsByGroup.get(g.id)
    if (existing) {
      pushAggregation(existing, g.id)
      continue
    }
    nextBsSequenceConsumed += 1
    const newBs: BioSampleDraft = {
      id: `bs-${submission.bsSequence + nextBsSequenceConsumed}`,
      intraDbValues: {},
      sourceGroupIds: [],
    }
    pushAggregation(newBs, g.id)
  }

  const biosamples: BioSampleDraft[] = []
  for (const id of orderedBsIds) {
    const entry = aggregated.get(id)
    if (!entry) continue
    biosamples.push({
      ...entry.bs,
      sourceGroupIds: entry.sourceGroupIds,
    })
  }

  // dismissedWarnings cleanup (data-model.md §4.4.2 / open-questions §10.1)
  // 動的 step (step-(biosample|dra|mss|gea|primary-bioproject)-${discriminator}) の
  // discriminator が現存 bs/bp id のいずれにも該当しないなら、関連 warning を捨てる。
  // 固定 step ID (step-umbrella-bioproject / step-jga / step-togovar / step-metabobank /
  // step-humandbs / step-dbcls-application / step-jpost / step-eva / step-dgva) は warning が
  // 再生成された際に id が変わらないため cleanup 対象外。
  const aliveDiscriminators = new Set<string>()
  for (const bs of biosamples) aliveDiscriminators.add(bs.id)
  aliveDiscriminators.add(primaryBp.id)
  // Haplotype phased で固定生成される bp id (rule11) は biosamples / primaryBp とは別に救う
  for (const fixed of ["bp-principal", "bp-alternate", "bp-dra-shared"]) {
    aliveDiscriminators.add(fixed)
  }

  const dismissedWarnings: Record<string, true> = {}
  for (const [warningId, value] of Object.entries(submission.dismissedWarnings)) {
    if (isDynamicStepWarning(warningId)) {
      const discriminator = extractStepDiscriminator(warningId)
      if (discriminator !== undefined && !aliveDiscriminators.has(discriminator)) {
        continue // discriminator が消滅 → cleanup
      }
    }
    dismissedWarnings[warningId] = value
  }

  return {
    ...submission,
    primaryBioProjects: [primaryBp],
    biosamples,
    bpSequence: submission.bpSequence + bpSequenceConsumed,
    bsSequence: submission.bsSequence + nextBsSequenceConsumed,
    dismissedWarnings,
  }
}

// warning id 構造: `${stepId}:rule14:...`
// 動的 step prefix の正規表現 (rules/shared.ts createStep / rule04 と整合)。
// JGA は単一 Step (step-jga) で固定 id のため動的 step prefix には含めない。
const DYNAMIC_STEP_PREFIX_RE =
  /^step-(?:biosample|dra|mss|gea|primary-bioproject)-(.+?)(?:-analysis)?:/

const isDynamicStepWarning = (warningId: string): boolean =>
  DYNAMIC_STEP_PREFIX_RE.test(warningId)

const extractStepDiscriminator = (warningId: string): string | undefined => {
  const m = warningId.match(DYNAMIC_STEP_PREFIX_RE)

  return m ? m[1] : undefined
}

// ----- Action handlers -----

const handleAddFile = (
  submission: Submission,
  payload: AddFilePayload,
): Submission => {
  const {
    groupType,
    members,
    buttonType,
    chipTags = [],
    defaultDataForm,
    autoAccess,
    groupOverrides,
    linkToBsId,
  } = payload
  const { id: groupId, sequence: groupSequence } = nextGroupId(submission)

  const memberFileIds = members.map((_, idx) => nextFileId(submission, idx + 1))

  const group: FileGroup = {
    id: groupId,
    groupType,
    memberFileIds,
    memberGroupIds: [],
    ...(groupOverrides?.notes !== undefined ? { notes: groupOverrides.notes } : {}),
    ...(groupOverrides?.referenceMeta !== undefined
      ? { referenceMeta: groupOverrides.referenceMeta }
      : {}),
    ...(groupOverrides?.experimentTypeHint !== undefined
      ? { experimentTypeHint: groupOverrides.experimentTypeHint }
      : {}),
    ...(groupOverrides?.metaboBankSubmissionType !== undefined
      ? { metaboBankSubmissionType: groupOverrides.metaboBankSubmissionType }
      : {}),
    ...(linkToBsId !== undefined ? { sourceBsHint: linkToBsId } : {}),
  }

  // 直前 (テーブル末尾) の FileEntry の列値を継承するデフォルト (本体 §5.4)
  const prev = submission.fileEntries[submission.fileEntries.length - 1]

  const fileEntries: FileEntry[] = members.map((m, idx) => {
    // ButtonType 既定の dataForm (BUTTON_META) を fallback として使う
    const dataFormInit = defaultDataForm ?? BUTTON_META[buttonType].defaultDataForm
    const fileId = memberFileIds[idx] ?? nextFileId(submission, idx + 1)
    const entry = buildFileEntry(
      fileId,
      groupId,
      buttonType,
      m.displayName,
      m.role,
      dataFormInit,
      chipTags,
    )
    if (prev) {
      if (prev.organism !== undefined) {
        entry.organism = prev.organism
        entry.columnSource.organism = "auto"
      }
      if (prev.accessRestriction !== undefined) {
        entry.accessRestriction = prev.accessRestriction
        entry.columnSource.accessRestriction = "auto"
      }
    }
    // 最初の 1 ファイル追加 (prev=undefined) かつ modal で autoAccess も指定されていない場合のみ、
    // access を "open" を default として auto セット (submit-alt3.md §5.4)。
    // 2 回目以降は prev コピーに任せ、prev も未設定なら undefined のまま。
    if (prev === undefined && entry.accessRestriction === undefined && autoAccess === undefined) {
      entry.accessRestriction = "open"
      entry.columnSource.accessRestriction = "auto"
    }
    // modal で確定した autoAccess (個人特定 yes 等) は直前行コピー / open default より優先
    if (autoAccess !== undefined) {
      entry.accessRestriction = autoAccess
      entry.columnSource.accessRestriction = "auto"
    }

    return entry
  })

  return recomputeBpAndBs({
    ...submission,
    fileGroups: [...submission.fileGroups, group],
    fileEntries: [...submission.fileEntries, ...fileEntries],
    groupSequence,
    fileSequence: submission.fileSequence + members.length,
  })
}

const handleEditCell = (
  submission: Submission,
  payload: Extract<SubmissionAction, { type: "edit-cell" }>["payload"],
): Submission => {
  const { fileId, column, value, source = "user" } = payload

  const fileEntries = submission.fileEntries.map((f) => {
    if (f.id !== fileId) return f
    const next: FileEntry = {
      ...f,
      columnSource: { ...f.columnSource, [column]: source },
    }
    // exactOptionalPropertyTypes 対応: undefined を代入せずキーを delete する
    if (column === "organism") {
      if (value === undefined) delete next.organism
      else next.organism = value as Organism
    }
    if (column === "accessRestriction") {
      if (value === undefined) delete next.accessRestriction
      else next.accessRestriction = value as AccessRestriction
    }
    if (column === "dataForm") {
      if (value === undefined) delete next.dataForm
      else next.dataForm = value as DataForm
    }

    // organism を human / human-microbiome に変更したとき、access がまだ user 入力で
    // 確定されていなければ auto で restricted にセット (Rule 6 JGA 経路を自動で発火させる)。
    // ユーザーがそれでも open に上書きしたい場合は、列で明示的に open を選び直せば
    // columnSource.accessRestriction="user" となり以後の自動上書きを抑止する。
    if (
      column === "organism" &&
      (value === "human" || value === "human-microbiome") &&
      next.columnSource.accessRestriction !== "user"
    ) {
      next.accessRestriction = "restricted"
      next.columnSource = { ...next.columnSource, accessRestriction: "auto" }
    }

    return next
  })

  return recomputeBpAndBs({ ...submission, fileEntries })
}

const handleRemoveFile = (
  submission: Submission,
  fileId: string,
): Submission => {
  const target = submission.fileEntries.find((f) => f.id === fileId)
  if (!target) return submission

  const remainingFiles = submission.fileEntries.filter((f) => f.id !== fileId)

  // Group のメンバから削除。空 Group は削除
  const remainingGroups = submission.fileGroups
    .map((g) => ({
      ...g,
      memberFileIds: g.memberFileIds.filter((id) => id !== fileId),
    }))
    .filter((g) => g.memberFileIds.length > 0)

  return recomputeBpAndBs({
    ...submission,
    fileEntries: remainingFiles,
    fileGroups: remainingGroups,
  })
}

const handleDismissWarning = (
  submission: Submission,
  warningId: string,
): Submission => ({
  ...submission,
  dismissedWarnings: { ...submission.dismissedWarnings, [warningId]: true },
})

// chipTags を patch する内部 helper。
// assembly-form を変えたら functional-genomics も自動更新する (manualOverride が立っていなければ)。
// tags.md §5.2.2
const patchChips = (
  chipTags: readonly ChipTag[],
  axis: ChipAxis,
  value: string | undefined,
  manualOverride: boolean | undefined,
): ChipTag[] => {
  const cleaned = value === undefined
    ? removeChipFromArray(chipTags, axis)
    : upsertChip(chipTags, {
      axis,
      value,
      ...(manualOverride !== undefined ? { manualOverride } : {}),
    })

  if (axis !== "assembly-form") return cleaned

  // assembly-form 変更時、functional-genomics の manualOverride が立っていなければ自動推測値で更新
  const fgChip = cleaned.find((c) => c.axis === "functional-genomics")
  if (fgChip?.manualOverride === true) return cleaned

  if (value === undefined) {
    return removeChipFromArray(cleaned, "functional-genomics")
  }
  const inferred = ASSEMBLY_FORM_TO_FUNCTIONAL_GENOMICS[value as AssemblyForm]
  if (inferred === undefined) return cleaned

  return upsertChip(cleaned, { axis: "functional-genomics", value: inferred })
}

const handleSetChip = (
  submission: Submission,
  payload: Extract<SubmissionAction, { type: "set-chip" }>["payload"],
): Submission => {
  const fileEntries = submission.fileEntries.map((f) => {
    if (f.id !== payload.fileId) return f

    return {
      ...f,
      chipTags: patchChips(f.chipTags, payload.axis, payload.value, payload.manualOverride),
    }
  })

  return { ...submission, fileEntries }
}

const handleResetChipManual = (
  submission: Submission,
  payload: Extract<SubmissionAction, { type: "reset-chip-manual" }>["payload"],
): Submission => {
  const fileEntries = submission.fileEntries.map((f) => {
    if (f.id !== payload.fileId) return f
    const chipTags = f.chipTags.map((c) => {
      if (c.axis !== payload.axis) return c
      const { manualOverride: _drop, ...rest } = c

      return rest
    })

    // functional-genomics のリセット時は assembly-form から自動推測し直す
    if (payload.axis === "functional-genomics") {
      const af = chipTags.find((c) => c.axis === "assembly-form")?.value as
        | AssemblyForm
        | undefined
      const inferred = af !== undefined
        ? ASSEMBLY_FORM_TO_FUNCTIONAL_GENOMICS[af]
        : undefined

      return {
        ...f,
        chipTags: inferred === undefined
          ? removeChipFromArray(chipTags, "functional-genomics")
          : upsertChip(chipTags, { axis: "functional-genomics", value: inferred }),
      }
    }

    return { ...f, chipTags }
  })

  return { ...submission, fileEntries }
}

const handleUpdateServiceDraft = (
  submission: Submission,
  payload: Extract<SubmissionAction, { type: "update-service-draft" }>["payload"],
): Submission => {
  const existing = submission.serviceDrafts[payload.stepId]
  const next: ServiceDraft = {
    ...(existing ?? { kind: payload.serviceKind }),
    kind: payload.serviceKind,
    ...payload.values,
  }

  return {
    ...submission,
    serviceDrafts: {
      ...submission.serviceDrafts,
      [payload.stepId]: next,
    },
  }
}

const handleRestoreWarning = (
  submission: Submission,
  warningId: string,
): Submission => {
  const { [warningId]: _drop, ...rest } = submission.dismissedWarnings

  return { ...submission, dismissedWarnings: rest }
}

const handleUpdateGroupReferenceMeta = (
  submission: Submission,
  payload: Extract<SubmissionAction, { type: "update-group-reference-meta" }>["payload"],
): Submission => {
  const fileGroups = submission.fileGroups.map((g) => {
    if (g.id !== payload.groupId) return g
    if (payload.referenceMeta === undefined) {
      const { referenceMeta: _drop, ...rest } = g

      return rest
    }

    return { ...g, referenceMeta: payload.referenceMeta }
  })

  return { ...submission, fileGroups }
}

// ----- entry point -----

export const submissionReducer = (
  submission: Submission,
  action: SubmissionAction,
): Submission => {
  switch (action.type) {
    case "add-file":
      return handleAddFile(submission, action.payload)
    case "edit-cell":
      return handleEditCell(submission, action.payload)
    case "remove-file":
      return handleRemoveFile(submission, action.payload.fileId)
    case "set-chip":
      return handleSetChip(submission, action.payload)
    case "reset-chip-manual":
      return handleResetChipManual(submission, action.payload)
    case "update-group-reference-meta":
      return handleUpdateGroupReferenceMeta(submission, action.payload)
    case "dismiss-warning":
      return handleDismissWarning(submission, action.payload.warningId)
    case "update-service-draft":
      return handleUpdateServiceDraft(submission, action.payload)
    case "restore-warning":
      return handleRestoreWarning(submission, action.payload.warningId)
  }
}
