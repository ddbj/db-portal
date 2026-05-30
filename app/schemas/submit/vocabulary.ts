import { z } from "zod"

// データファイルの種別。真の一次登録単位のみを値域とする (テーブルの行を生む単位)
export const FileTypeKind = z.enum([
  "sequence-read",
  "sequence-nucleotide",
  "sequence-annotation",
  "variant",
  "expression-matrix",
  "microarray-expression",
  "spatial-transcriptomics",
  "spatial-image",
  "mass-spectrometry",
  "nmr",
  "metabolite-assignment",
])
export type FileTypeKind = z.infer<typeof FileTypeKind>

// Q1 登録種別。前段の単一選択。行レベル Access の default を注入する
export const Q1 = z.enum([
  "public",
  "restricted",
  "third-party",
])
export type Q1 = z.infer<typeof Q1>

// Q2 生物ドメイン。前段の単一選択で、submission 全体の唯一の生物軸
export const Q2 = z.enum([
  "human",
  "eukaryote",
  "prokaryote",
  "virus",
  "metagenome",
])
export type Q2 = z.infer<typeof Q2>

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
  "assembly-annotation",
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
// SNP/SV、MSS data type の WGS/TSA/TLS 等) は chip にせず Step カードの Intra-DB Tag で扱う。
// 第三者 (TPA) は提出単位 (Q1) で決まる軸なので ChipAxis には持たない
export const ChipAxis = z.enum([
  "assembly-form",
  "mass-spec-domain",
  "spatial-platform",
])
export type ChipAxis = z.infer<typeof ChipAxis>

// 行追加時に注入する種別ごとの default data form
export const TYPICAL_DATA_FORM_FOR_KIND: Readonly<Record<FileTypeKind, DataForm>> = {
  "sequence-read": "raw",
  "sequence-nucleotide": "assembled",
  "sequence-annotation": "annotation",
  "variant": "variant-call",
  "expression-matrix": "matrix",
  "microarray-expression": "matrix",
  "spatial-transcriptomics": "matrix",
  "spatial-image": "image",
  "mass-spectrometry": "spectrum",
  "nmr": "spectrum",
  "metabolite-assignment": "assignment",
}

// 行追加時に自動生成する単純 group の default group type
export const TYPICAL_GROUP_TYPE_FOR_KIND: Readonly<Record<FileTypeKind, GroupType>> = {
  "sequence-read": "single",
  "sequence-nucleotide": "single",
  "sequence-annotation": "single",
  "variant": "single",
  "expression-matrix": "single",
  "microarray-expression": "mage-tab",
  "spatial-transcriptomics": "single",
  "spatial-image": "single",
  "mass-spectrometry": "single",
  "nmr": "single",
  "metabolite-assignment": "single",
}

// 行追加時に自動採番する default filename の種別ごとの prefix と拡張子
export const DEFAULT_FILENAME_FOR_KIND: Readonly<
  Record<FileTypeKind, { prefix: string; ext: string }>
> = {
  "sequence-read": { prefix: "read", ext: "fastq" },
  "sequence-nucleotide": { prefix: "seq", ext: "fasta" },
  "sequence-annotation": { prefix: "ann", ext: "gff" },
  "variant": { prefix: "var", ext: "vcf" },
  "expression-matrix": { prefix: "mtx", ext: "tsv" },
  "microarray-expression": { prefix: "arr", ext: "cel" },
  "spatial-transcriptomics": { prefix: "spt", ext: "tsv" },
  "spatial-image": { prefix: "img", ext: "tiff" },
  "mass-spectrometry": { prefix: "ms", ext: "mzML" },
  "nmr": { prefix: "nmr", ext: "nmrML" },
  "metabolite-assignment": { prefix: "maf", ext: "tsv" },
}

export const ALLOWED_CHIP_VALUES: Readonly<Record<ChipAxis, readonly string[]>> = {
  "assembly-form": ["raw", "primary", "binned", "mag", "sag", "hybrid"],
  "mass-spec-domain": ["proteomics", "metabolomics"],
  "spatial-platform": ["visium", "xenium", "merfish", "stereo-seq"],
}

export const isAllowedChipValue = (axis: ChipAxis, value: string): boolean =>
  ALLOWED_CHIP_VALUES[axis].includes(value)

// spatial-platform → GEA Submission Type の分類。Sequencing 系は生リードを DRA に出す
// 2 段 (spatial recipe が DRA step を emit)。それ以外 (xenium / merfish) は GEA のみ
export const SEQUENCING_SPATIAL_PLATFORMS: readonly string[] = ["visium", "stereo-seq"]

export const isSequencingSpatialPlatform = (value: string): boolean =>
  SEQUENCING_SPATIAL_PLATFORMS.includes(value)
