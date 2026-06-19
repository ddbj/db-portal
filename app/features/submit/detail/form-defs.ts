import type {
  ChipAxis,
  DataForm,
  FileTypeKind,
  GroupType,
} from "~/schemas/submit"

export type FormOptionEffect = {
  groupType?: GroupType
  dataForm?: DataForm
  chipAdd?: { axis: ChipAxis; value: string }
  chipRemoveAxis?: ChipAxis
}

export type FormOptionDef = {
  value: string
  labelKey: string
  subKey?: string
  effect: FormOptionEffect
}

type FormGroupDef = {
  id: string
  num: string
  labelKey: string
  kind: "radio" | "check"
  options: readonly FormOptionDef[]
}

type RowFormDef = {
  groups: readonly FormGroupDef[]
}

const EMPTY_DEF: RowFormDef = { groups: [] }

// 塩基配列: 単独 / MAG / SAG / TPA。MAG/SAG は ddbj ENV genome に分岐、TPA は ddbj MSS に分岐
const sequenceDef: RowFormDef = {
  groups: [
    {
      id: "form",
      num: "1.",
      labelKey: "submit.detail.formGroupLabels.form",
      kind: "radio",
      options: [
        {
          value: "single",
          labelKey: "submit.detail.options.sequenceNucleotide.standalone.label",
          subKey: "submit.detail.options.sequenceNucleotide.standalone.sub",
          effect: { chipRemoveAxis: "assembly-form" },
        },
        {
          value: "mag-chain",
          labelKey: "submit.detail.options.sequenceNucleotide.magChain.label",
          subKey: "submit.detail.options.sequenceNucleotide.magChain.sub",
          effect: { chipAdd: { axis: "assembly-form", value: "mag" } },
        },
        {
          value: "sag-chain",
          labelKey: "submit.detail.options.sequenceNucleotide.sagChain.label",
          subKey: "submit.detail.options.sequenceNucleotide.sagChain.sub",
          effect: { chipAdd: { axis: "assembly-form", value: "sag" } },
        },
      ],
    },
    {
      id: "tpa",
      num: "2.",
      labelKey: "submit.detail.formGroupLabels.tpa",
      kind: "check",
      options: [
        {
          value: "tpa",
          labelKey: "submit.detail.options.sequenceNucleotide.tpa.label",
          subKey: "submit.detail.options.sequenceNucleotide.tpa.sub",
          effect: { chipAdd: { axis: "tpa", value: "true" } },
        },
      ],
    },
    {
      id: "small-scale",
      num: "3.",
      labelKey: "submit.detail.formGroupLabels.smallScale",
      kind: "check",
      options: [
        {
          value: "small-scale",
          labelKey: "submit.detail.options.sequenceNucleotide.smallScale.label",
          subKey: "submit.detail.options.sequenceNucleotide.smallScale.sub",
          effect: { chipAdd: { axis: "small-scale", value: "true" } },
        },
      ],
    },
  ],
}

const spatialTranscriptomicsDef: RowFormDef = {
  groups: [
    {
      id: "platform",
      num: "1.",
      labelKey: "submit.detail.formGroupLabels.platform",
      kind: "radio",
      options: [
        {
          value: "visium",
          labelKey: "submit.detail.options.spatialTranscriptomics.visium.label",
          subKey: "submit.detail.options.spatialTranscriptomics.visium.sub",
          effect: { chipAdd: { axis: "spatial-platform", value: "visium" } },
        },
        {
          value: "xenium",
          labelKey: "submit.detail.options.spatialTranscriptomics.xenium.label",
          subKey: "submit.detail.options.spatialTranscriptomics.xenium.sub",
          effect: { chipAdd: { axis: "spatial-platform", value: "xenium" } },
        },
        {
          value: "merfish",
          labelKey: "submit.detail.options.spatialTranscriptomics.merfish.label",
          subKey: "submit.detail.options.spatialTranscriptomics.merfish.sub",
          effect: { chipAdd: { axis: "spatial-platform", value: "merfish" } },
        },
        {
          value: "stereo-seq",
          labelKey: "submit.detail.options.spatialTranscriptomics.stereoSeq.label",
          subKey: "submit.detail.options.spatialTranscriptomics.stereoSeq.sub",
          effect: { chipAdd: { axis: "spatial-platform", value: "stereo-seq" } },
        },
      ],
    },
  ],
}

export const ROW_FORM_DEFS: Readonly<Record<FileTypeKind, RowFormDef>> = {
  "sequence-read": EMPTY_DEF,
  "sequence": sequenceDef,
  "variant": EMPTY_DEF,
  "expression-matrix": EMPTY_DEF,
  "microarray-expression": EMPTY_DEF,
  "spatial-transcriptomics": spatialTranscriptomicsDef,
  "metabolomics": EMPTY_DEF,
  "proteome": EMPTY_DEF,
}

// flow-changing 軸を持つ種別だけが file 詳細質問を持つ。持たない種別はデータ詳細セルを出さない
export const hasRowDetail = (kind: FileTypeKind): boolean =>
  ROW_FORM_DEFS[kind].groups.length > 0
