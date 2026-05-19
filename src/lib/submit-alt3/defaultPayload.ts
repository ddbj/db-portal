// submit-alt3 ボタン押下時のデフォルト AddFilePayload 生成 helper
// SSOT: docs/submit-alt3.md §3 / docs/submit-alt3-modals.md §6.2
// modal を出さずにボタン押下だけで行追加するためのデフォルト値定義。
// modal は行ごとの「編集」アクションで開く (FileRow の Pencil アイコン)。

import type { AddFilePayload } from "@/lib/submit-alt3/reducer"
import type {
  ButtonType,
  FileRole,
  GroupType,
  Submission,
} from "@/types/submit-alt3"

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
