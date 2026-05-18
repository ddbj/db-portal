// submit-alt3 (登録ナビゲーション v3) 型定義
// SSOT: docs/submit-alt3-data-model.md §4
// 値域 (controlled vocabulary) と TS 型を `as const` ペアで宣言する

// ----- ButtonType (9 種) -----

export const BUTTON_TYPES = [
  "sequence-read",
  "assembled",
  "annotation",
  "variation",
  "phenotype",
  "expression-array",
  "expression-matrix",
  "mass-spec",
  "spatial-tx",
] as const
export type ButtonType = (typeof BUTTON_TYPES)[number]

// ----- テーブル列 3 軸 (Cross-DB Tag、per-cell 編集) -----

export const ORGANISMS = [
  "human",
  "human-microbiome",
  "eukaryote",
  "prokaryote",
  "virus",
  "metagenome",
  "organelle-plasmid",
] as const
export type Organism = (typeof ORGANISMS)[number]

export const ACCESS_RESTRICTIONS = ["open", "restricted"] as const
export type AccessRestriction = (typeof ACCESS_RESTRICTIONS)[number]

export const DATA_FORMS = [
  "raw",
  "assembled",
  "analysis-output",
  "matrix",
  "annotation",
  "mass-spec",
  "phenotype",
] as const
export type DataForm = (typeof DATA_FORMS)[number]

// ----- chip 軸 (10 軸、Cross-DB Tag non-grouping) -----

export const CHIP_AXES = [
  "assembly-form",
  "provenance",
  "variation-form",
  "variation-type",
  "haplotype-mode",
  "functional-genomics",
  "mass-spec-domain",
  "spatial-platform",
  "tpa-subtype",
  "haplotype-naming",
] as const
export type ChipAxis = (typeof CHIP_AXES)[number]

export const ASSEMBLY_FORMS = [
  "wgs",
  "gnm",
  "tsa",
  "tls",
  "est",
  "mag",
  "sag",
  "htg",
  "htc",
  "gss",
  "syn",
  "misc",
  "ask",
] as const
export type AssemblyForm = (typeof ASSEMBLY_FORMS)[number]

export const PROVENANCES = ["third-party"] as const
export type Provenance = (typeof PROVENANCES)[number]

export const VARIATION_FORMS = ["per-sample", "aggregate"] as const
export type VariationForm = (typeof VARIATION_FORMS)[number]

export const VARIATION_TYPES = ["snp-indel", "sv", "cnv"] as const
export type VariationType = (typeof VARIATION_TYPES)[number]

export const HAPLOTYPE_MODES = ["phased"] as const
export type HaplotypeMode = (typeof HAPLOTYPE_MODES)[number]

export const FUNCTIONAL_GENOMICS_VALUES = [
  "yes",
  "wgs-target",
  "tsa-target",
  "metagenome-target",
  "variation-target",
  "wes-target",
  "other",
] as const
export type FunctionalGenomics = (typeof FUNCTIONAL_GENOMICS_VALUES)[number]

export const MASS_SPEC_DOMAINS = ["proteomics", "metabolomics", "imaging"] as const
export type MassSpecDomain = (typeof MASS_SPEC_DOMAINS)[number]

export const SPATIAL_PLATFORMS = [
  "visium",
  "xenium",
  "merfish",
  "stereo-seq",
  "slide-seq",
  "geomx",
  "other",
] as const
export type SpatialPlatform = (typeof SPATIAL_PLATFORMS)[number]

export const TPA_SUBTYPES = ["tpa-assembly", "tpa-specialist-db"] as const
export type TpaSubtype = (typeof TPA_SUBTYPES)[number]

export const HAPLOTYPE_NAMINGS = [
  "principal-alternate",
  "haplotype-1-2",
  "maternal-paternal",
] as const
export type HaplotypeNaming = (typeof HAPLOTYPE_NAMINGS)[number]

// ChipTag の axis-value union を 1 型で受けると tagged union が緩くなるので、
// 値の整合性は reducer / masters 側で保つ前提で string にしておく
export interface ChipTag {
  axis: ChipAxis
  value: string
  manualOverride?: boolean
}

// ----- FileRole / GroupType -----

export const FILE_ROLES = [
  "single",
  "r1",
  "r2",
  "i1",
  "i2",
  "cy3",
  "cy5",
  "short-read",
  "long-read",
  "idf",
  "sdrf",
  "raw",
  "processed",
  "imzml",
  "ibd",
  "image",
  "vcf",
  "reference-fasta",
  "primary-fasta",
  "binned-fasta",
  "mag-fasta",
  "demultiplexed-per-sample",
  "phenotype-table",
  "fasta-assembly",
  "gff-annotation",
  "bam",
  "bas-h5",
  "bax-h5",
  "maf",
] as const
export type FileRole = (typeof FILE_ROLES)[number]

export const GROUP_TYPES = [
  "single",
  "pair-end",
  "10x",
  "pacbio-hdf5",
  "two-color",
  "hybrid",
  "multiplex",
  "mage-tab",
  "imaging-ms",
  "variation-ref",
  "mag-sag-chain",
  "assembly-annotation",
  "jga-dataset",
] as const
export type GroupType = (typeof GROUP_TYPES)[number]

// ----- ServiceKind / 表示順序 -----

export const SERVICE_KINDS = [
  "umbrella-bioproject",
  "primary-bioproject",
  "biosample",
  "dra",
  "jga-submission",
  "jga-study",
  "jga-sample",
  "jga-experiment",
  "jga-data",
  "jga-analysis",
  "jga-dataset",
  "jga-policy",
  "gea",
  "mss",
  "metabobank",
  "togovar",
  "dbcls-application",
  "jpost",
  "eva",
  "dgva",
  "humandbs",
] as const
export type ServiceKind = (typeof SERVICE_KINDS)[number]

// 外部 Service (badgeKind=external)
// docs/submit-alt3.md §6.2 SSOT
export const EXTERNAL_SERVICES: readonly ServiceKind[] = [
  "dbcls-application",
  "jpost",
  "eva",
  "dgva",
  "humandbs",
]

// ----- ColumnSource (auto vs user) -----

export interface ColumnSource {
  organism?: "user" | "auto"
  accessRestriction?: "user" | "auto"
  dataForm?: "user" | "auto"
}

// ----- FileEntry / FileGroup / ReferenceMeta -----

export interface FileEntry {
  id: string
  groupId: string
  additionalGroupIds?: string[]
  buttonType: ButtonType
  displayName: string
  role?: FileRole
  fileFormat?: string

  organism?: Organism
  accessRestriction?: AccessRestriction
  dataForm?: DataForm

  columnSource: ColumnSource

  chipTags: ChipTag[]
}

export interface ReferenceMeta {
  citedAccessions?: string[]
  doi?: string
  pubmedId?: string
  rawStatus?: "external" | "pending" | "external-db"
  externalRawAccession?: string
  reviewStatus?: "unconfirmed" | "confirmed"
  geomxReadout?: "ngs" | "ncounter"
  notes?: string
}

export interface FileGroup {
  id: string
  groupType: GroupType
  memberFileIds: string[]
  memberGroupIds: string[]
  parentGroupId?: string
  notes?: string
  referenceMeta?: ReferenceMeta
  experimentTypeHint?: string
  metaboBankSubmissionType?: string
  // modal で「既存 BS と関連付け」が選ばれた場合の対象 BS id。
  // recomputeBpAndBs が新規 BS を作らず既存 BS の sourceGroupIds に追加する目印 (data-model §4.3.1)。
  sourceBsHint?: string
}

// ----- BioProjectDraft / BioSampleDraft -----

export type HaplotypePhase =
  | "principal"
  | "alternate"
  | `haplotype-${number}`
  | "maternal"
  | "paternal"
  | "dra-shared"

export interface BioProjectDraft {
  id: string
  intraDbValues: Record<string, unknown>
  derivedFromTags: Pick<
    FileEntry,
    "organism" | "accessRestriction" | "dataForm"
  >[]
  commonLineage?: string
  isUmbrella?: boolean
  umbrellaChildrenIds?: string[]
  haplotypePhase?: HaplotypePhase
}

export interface BioSampleDraft {
  id: string
  intraDbValues: Record<string, unknown>
  sourceGroupIds: string[]
  derivedFromBsIds?: string[]
}

// ----- ServiceDraft -----

// PoC では Record<string, unknown> として緩く扱う (data-model.md §4.4)
// Phase B 以降で discriminated union に強化していく
export type ServiceDraft = { kind: ServiceKind } & Record<string, unknown>

// ----- Submission (上位 state) -----

export interface Submission {
  umbrellaBioProject?: BioProjectDraft
  primaryBioProjects: BioProjectDraft[]
  biosamples: BioSampleDraft[]
  fileGroups: FileGroup[]
  fileEntries: FileEntry[]
  serviceDrafts: Record<string, ServiceDraft>
  dismissedWarnings: Record<string, true>

  // 永続化連番カウンタ (data-model.md §4.4.1)
  // 内部 state、UI からは触れない
  bpSequence: number
  bsSequence: number
  fileSequence: number
  groupSequence: number
  derivedBsSequence: number
}

// ----- FlowCard / FlowStep / FlowWarning -----

export interface FlowWarning {
  id: string
  severity: "warning" | "info"
  messageKey: string
  messageParams?: Record<string, string>
  acknowledged?: boolean
  // Rule 14b 3 種操作 (chip 修正 / Step 入力変更 / 無視) のフォーカス先メタ
  actionHints?: {
    chipFileId?: string
    chipAxis?: ChipAxis
    suggestedChipValue?: string
    stepInputField?: string
  }
}

export interface FlowStep {
  id: string
  service: ServiceKind
  title: string
  targetGroupIds: string[]
  targetFileIds: string[]
  intraDbInputs: Record<string, unknown>
  upstreamStepIds: string[]
  issuedAccessionTypes: string[]
  badgeKind: "internal" | "external"
  notes: string[]
  warnings: FlowWarning[]
}

export interface FlowCard {
  steps: FlowStep[]
  globalWarnings: FlowWarning[]
}

// ----- empty Submission factory -----

export const createEmptySubmission = (): Submission => ({
  primaryBioProjects: [],
  biosamples: [],
  fileGroups: [],
  fileEntries: [],
  serviceDrafts: {},
  dismissedWarnings: {},
  bpSequence: 0,
  bsSequence: 0,
  fileSequence: 0,
  groupSequence: 0,
  derivedBsSequence: 0,
})
