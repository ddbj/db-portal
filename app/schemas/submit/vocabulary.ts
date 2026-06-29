import { z } from "zod"

// データファイルの種別。真の一次登録単位のみを値域とする (テーブルの行を生む単位)
export const FileTypeKind = z.enum([
  "sequence-read",
  "sequence",
  "variant",
  "expression-matrix",
  "microarray-expression",
  "spatial-transcriptomics",
  "metabolomics",
  "proteome",
])
export type FileTypeKind = z.infer<typeof FileTypeKind>

// OrganismDomain (生物ドメイン)。前段の単一選択で、submission 全体の唯一の生物軸
export const OrganismDomain = z.enum([
  "human",
  "eukaryote",
  "prokaryote",
  "virus",
  "metagenome",
  "other",
])
export type OrganismDomain = z.infer<typeof OrganismDomain>

export const GroupType = z.enum([
  "single",
  "pair-end",
  "10x",
  "multiplex",
  "two-color",
  "mage-tab",
  "hybrid",
  "imaging-ms",
  "variation-with-reference",
  "mag-sag-chain",
  "jga-dataset",
  "pacbio-hdf5",
])
export type GroupType = z.infer<typeof GroupType>

export const Access = z.enum(["open", "restricted"])
export type Access = z.infer<typeof Access>

export const DataForm = z.enum([
  "raw",
  "assembled",
  "annotation",
  "variant-call",
  "matrix",
  "image",
  "spectrum",
  "assignment",
])
export type DataForm = z.infer<typeof DataForm>

// テーブル列・前段で表現できない、かつ出る service / step を変える (flow-changing) 細部区分を
// 行内 chip の {axis, value} ペアで表現する。出る service を変えない区分 (バリアントの
// SNP/SV、MSS data type の WGS/TSA/TLS 等) は chip にせず Step カードの Intra-DB Tag で扱う
export const ChipAxis = z.enum([
  "assembly-form",
  "has-annotation",
  "tpa",
  "small-scale",
  "spatial-platform",
  "expression-source",
  "identifiability",
])
export type ChipAxis = z.infer<typeof ChipAxis>

export const IDENTIFIABLE_KINDS: ReadonlySet<FileTypeKind> = new Set([
  "sequence-read",
  "sequence",
  "variant",
])

// 行追加時に注入する種別ごとの default data form
export const TYPICAL_DATA_FORM_FOR_KIND: Readonly<Record<FileTypeKind, DataForm>> = {
  "sequence-read": "raw",
  "sequence": "assembled",
  "variant": "variant-call",
  "expression-matrix": "matrix",
  "microarray-expression": "matrix",
  "spatial-transcriptomics": "matrix",
  "metabolomics": "spectrum",
  "proteome": "spectrum",
}

// 行追加時に自動生成する単純 group の default group type
export const TYPICAL_GROUP_TYPE_FOR_KIND: Readonly<Record<FileTypeKind, GroupType>> = {
  "sequence-read": "single",
  "sequence": "single",
  "variant": "single",
  "expression-matrix": "single",
  "microarray-expression": "mage-tab",
  "spatial-transcriptomics": "single",
  "metabolomics": "single",
  "proteome": "single",
}

export type FileEntryChipLiteral = { axis: ChipAxis; value: string }

export const DEFAULT_CHIPS_FOR_KIND: Readonly<Partial<Record<FileTypeKind, readonly FileEntryChipLiteral[]>>> = {
  "sequence": [
    { axis: "assembly-form", value: "genome" },
    { axis: "has-annotation", value: "true" },
  ],
}

export const ALLOWED_CHIP_VALUES: Readonly<Record<ChipAxis, readonly string[]>> = {
  "assembly-form": ["raw", "primary", "binned", "genome", "mag", "sag", "hybrid", "haplotype"],
  "has-annotation": ["true"],
  "tpa": ["true"],
  "small-scale": ["true"],
  "spatial-platform": ["visium", "xenium", "merfish", "stereo-seq"],
  "expression-source": ["ngs"],
  "identifiability": ["non-identifiable", "identifiable"],
}

export const isAllowedChipValue = (axis: ChipAxis, value: string): boolean =>
  ALLOWED_CHIP_VALUES[axis].includes(value)

// spatial-platform → GEA Submission Type の分類。Sequencing 系は生リードを DRA に出す
// 2 段 (spatial recipe が DRA step を emit)。それ以外 (xenium / merfish) は GEA のみ
const SEQUENCING_SPATIAL_PLATFORMS: readonly string[] = ["visium", "stereo-seq"]

export const isSequencingSpatialPlatform = (value: string): boolean =>
  SEQUENCING_SPATIAL_PLATFORMS.includes(value)

export const isNgsExpressionSource = (entry: { chipTags: readonly { axis: string; value: string }[] }): boolean =>
  entry.chipTags.some((c) => c.axis === "expression-source" && c.value === "ngs")
