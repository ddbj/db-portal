// submit-alt3 ボタン押下時のデフォルト AddFilePayload 生成 helper
// SSOT: docs/submit-alt3.md §3 / docs/submit-alt3-modals.md §6.2
// modal を出さずにボタン押下だけで行追加するためのデフォルト値定義。
// modal は行ごとの「編集」アクションで開く (FileRow の Pencil アイコン)。

import type { AddFilePayload } from "@/lib/submit-alt3/reducer"
import type {
  ButtonType,
  ChipAxis,
  ChipTag,
  FileRole,
  GroupType,
  Submission,
} from "@/types/submit-alt3"

// クラス A: 「1 Group = 1 sample/run、全 file の列 + chip が共通」な GroupType。
// UI 上は GroupHeader を出さず 1 行に集約し、ファイル列セルに displayName を縦並びで表示する。
// 列 (organism / access) の per-cell 編集は Group 内全 file に同じ値を伝播する。
// SSOT: docs/submit-alt3.md §4.1 / §5
//
// クラス B (hybrid / multiplex): Group 内 file は概念上は共通だが、N BS 展開や別 Experiment 分離が
//   発生する。Phase 2 で 1 行 + 展開 UI を実装予定 (現状はクラス C 同様 GroupHeader 表示)。
// クラス C (variation-ref / mag-sag-chain / assembly-annotation / jga-dataset): Group 内で
//   dataForm / chip がまたがる。複数行 + GroupHeader を維持する。
export const SINGLE_ROW_GROUP_TYPES: readonly GroupType[] = [
  "single",
  "pair-end",
  "10x",
  "pacbio-hdf5",
  "two-color",
  "mage-tab",
  "imaging-ms",
]

const SINGLE_ROW_GROUP_TYPE_SET: ReadonlySet<GroupType> = new Set(
  SINGLE_ROW_GROUP_TYPES,
)

// この GroupType の Group は 1 行集約表示してよいか (= GroupHeader を出さない)
export const isSingleRowGroup = (groupType: GroupType): boolean =>
  SINGLE_ROW_GROUP_TYPE_SET.has(groupType)

// ButtonType ごとの baseName 連番 prefix
export const BUTTON_BASE_NAME_PREFIX: Readonly<Record<ButtonType, string>> = {
  "sequence-read": "read",
  "assembled": "asm",
  "annotation": "ann",
  "variation": "var",
  "phenotype": "phe",
  "expression-array": "arr",
  "expression-matrix": "mtx",
  "mass-spec": "ms",
  "spatial-tx": "spt",
}

// 既存 fileEntries 内の同 ButtonType displayName から連番を抽出し、max+1 を 3 桁 padded で返す。
// 例: 既存に "read-001_R1.fastq.gz" があれば次は "read-002"。削除後の再追加で衝突しないよう max 方式。
export const nextBaseName = (
  submission: Submission,
  buttonType: ButtonType,
): string => {
  const prefix = BUTTON_BASE_NAME_PREFIX[buttonType]
  const re = new RegExp(`^${prefix}-(\\d+)`)
  let maxN = 0
  for (const f of submission.fileEntries) {
    if (f.buttonType !== buttonType) continue
    const m = f.displayName.match(re)
    if (m && m[1] !== undefined) {
      const n = Number.parseInt(m[1], 10)
      if (Number.isFinite(n) && n > maxN) maxN = n
    }
  }

  return `${prefix}-${String(maxN + 1).padStart(3, "0")}`
}

// ButtonType ごとのデフォルト AddFilePayload。
// modal の初期 state でユーザーが「追加」を押した場合と同じ最小構成を返す。
// 各 modal (SequenceReadModal.tsx 等) の handleSubmit 冒頭の初期値ロジックと整合させる。
export const buildDefaultAddFilePayload = (
  submission: Submission,
  buttonType: ButtonType,
): AddFilePayload => {
  const base = nextBaseName(submission, buttonType)

  switch (buttonType) {
    case "sequence-read":
      // SequenceReadModal: layout=pair-end / multiplex=single-sample / q1=yes (=GEA)
      return {
        buttonType,
        groupType: "pair-end",
        members: [
          { displayName: `${base}_R1.fastq.gz`, role: "r1" satisfies FileRole },
          { displayName: `${base}_R2.fastq.gz`, role: "r2" satisfies FileRole },
        ],
        chipTags: [{ axis: "functional-genomics", value: "yes" }],
      }

    case "assembled":
      // AssembledModal: assembly-form=wgs / primary / phased=false
      return {
        buttonType,
        groupType: "single",
        members: [{ displayName: `${base}.fasta`, role: "single" }],
        chipTags: [
          { axis: "assembly-form", value: "wgs" },
          { axis: "functional-genomics", value: "wgs-target" },
        ],
      }

    case "annotation":
      // AnnotationModal: target=assembly / format=gff
      return {
        buttonType,
        groupType: "single",
        members: [{ displayName: `${base}.gff3`, role: "single" }],
        chipTags: [{ axis: "functional-genomics", value: "other" }],
      }

    case "variation":
      // VariationModal: form=per-sample / type=snp-indel / reference=none
      return {
        buttonType,
        groupType: "single",
        members: [{ displayName: `${base}.vcf.gz`, role: "vcf" }],
        chipTags: [
          { axis: "variation-form", value: "per-sample" },
          { axis: "variation-type", value: "snp-indel" },
          { axis: "functional-genomics", value: "variation-target" },
        ],
      }

    case "phenotype":
      // PhenotypeModal: format=tsv / identifiable=no / dataset=no
      return {
        buttonType,
        groupType: "single",
        members: [{ displayName: `${base}.tsv`, role: "phenotype-table" }],
        chipTags: [{ axis: "functional-genomics", value: "other" }],
      }

    case "expression-array":
      // ExpressionArrayModal: color=single-color / attachMageTab=false
      return {
        buttonType,
        groupType: "single" satisfies GroupType,
        members: [{ displayName: `${base}.cel`, role: "single" }],
        chipTags: [{ axis: "functional-genomics", value: "yes" }],
      }

    case "expression-matrix":
      // ExpressionMatrixModal: content=counts / category=bulk-rnaseq / attachMageTab=false
      return {
        buttonType,
        groupType: "single",
        members: [{ displayName: `${base}_counts.tsv`, role: "single" }],
        chipTags: [{ axis: "functional-genomics", value: "yes" }],
        groupOverrides: { experimentTypeHint: "bulk-rnaseq" },
      }

    case "mass-spec":
      // MassSpecModal: domain=metabolomics / submissionType=LC-MS / attachMaf=false
      return {
        buttonType,
        groupType: "single",
        members: [{ displayName: `${base}.mzML`, role: "single" }],
        chipTags: [
          { axis: "mass-spec-domain", value: "metabolomics" },
          { axis: "functional-genomics", value: "other" },
        ],
        groupOverrides: { metaboBankSubmissionType: "LC-MS" },
      }

    case "spatial-tx":
      // SpatialTxModal: platform=visium / attachMageTab=false
      return {
        buttonType,
        groupType: "single",
        members: [{ displayName: `${base}_matrix.tsv`, role: "single" }],
        chipTags: [
          { axis: "functional-genomics", value: "yes" },
          { axis: "spatial-platform", value: "visium" },
        ],
      }
  }
}

// ButtonType ごとの「default chip 値」マップ。UI 表示で隠す対象を判定するための索引。
// buildDefaultAddFilePayload の chipTags と一致するが、O(1) lookup できるよう Map で持つ。
// 内部 state には今まで通り全 chip を保持し、UI の表示時のみここを参照してフィルタする。
// SSOT: docs/submit-alt3.md §5 / docs/submit-alt3-tags.md §5.2
export const DEFAULT_CHIP_VALUES: Readonly<
  Record<ButtonType, ReadonlyMap<ChipAxis, string>>
> = {
  "sequence-read": new Map([["functional-genomics", "yes"]]),
  "assembled": new Map([
    ["assembly-form", "wgs"],
    ["functional-genomics", "wgs-target"],
  ]),
  "annotation": new Map([["functional-genomics", "other"]]),
  "variation": new Map([
    ["variation-form", "per-sample"],
    ["variation-type", "snp-indel"],
    ["functional-genomics", "variation-target"],
  ]),
  "phenotype": new Map([["functional-genomics", "other"]]),
  "expression-array": new Map([["functional-genomics", "yes"]]),
  "expression-matrix": new Map([["functional-genomics", "yes"]]),
  "mass-spec": new Map([
    ["mass-spec-domain", "metabolomics"],
    ["functional-genomics", "other"],
  ]),
  "spatial-tx": new Map([
    ["functional-genomics", "yes"],
    ["spatial-platform", "visium"],
  ]),
}

// chip が ButtonType の default 値と一致するか (UI 表示で隠す判定)
export const isDefaultChip = (
  buttonType: ButtonType,
  chip: ChipTag,
): boolean => {
  const defaultValue = DEFAULT_CHIP_VALUES[buttonType].get(chip.axis)

  return defaultValue !== undefined && defaultValue === chip.value
}

// chipTags から default 値ペアを除外して表示用配列を返す
export const filterDisplayChips = (
  buttonType: ButtonType,
  chipTags: readonly ChipTag[],
): ChipTag[] => chipTags.filter((c) => !isDefaultChip(buttonType, c))
