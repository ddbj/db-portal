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

export type FormGroupDef = {
  id: string
  num: string
  labelKey: string
  kind: "radio" | "check"
  options: readonly FormOptionDef[]
}

export type RowFormDef = {
  groups: readonly FormGroupDef[]
}

const EMPTY_DEF: RowFormDef = { groups: [] }

const domainGroup = (kindKey: string): FormGroupDef => ({
  id: "domain",
  num: "1.",
  labelKey: "submit.detail.formGroupLabels.domain",
  kind: "radio",
  options: [
    {
      value: "metabolomics",
      labelKey: `submit.detail.options.${kindKey}.metabolomics.label`,
      subKey: `submit.detail.options.${kindKey}.metabolomics.sub`,
      effect: { chipAdd: { axis: "mass-spec-domain", value: "metabolomics" } },
    },
    {
      value: "proteomics",
      labelKey: `submit.detail.options.${kindKey}.proteomics.label`,
      subKey: `submit.detail.options.${kindKey}.proteomics.sub`,
      effect: { chipAdd: { axis: "mass-spec-domain", value: "proteomics" } },
    },
  ],
})

// 単独 / MAG チェーン / SAG チェーン。MAG/SAG だけが recipe を起動して flow を変える
const sequenceNucleotideDef: RowFormDef = {
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
  ],
}

// 配列とペア (MSS 1 step に束ねる scope) / 単独
const sequenceAnnotationDef: RowFormDef = {
  groups: [
    {
      id: "target",
      num: "1.",
      labelKey: "submit.detail.formGroupLabels.target",
      kind: "radio",
      options: [
        {
          value: "assembly-pair",
          labelKey: "submit.detail.options.sequenceAnnotation.assemblyPair.label",
          subKey: "submit.detail.options.sequenceAnnotation.assemblyPair.sub",
          effect: { groupType: "assembly-annotation" },
        },
        {
          value: "standalone",
          labelKey: "submit.detail.options.sequenceAnnotation.standalone.label",
          subKey: "submit.detail.options.sequenceAnnotation.standalone.sub",
          effect: { groupType: "single" },
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

const spatialImageDef: RowFormDef = {
  groups: [
    {
      id: "platform",
      num: "1.",
      labelKey: "submit.detail.formGroupLabels.platform",
      kind: "radio",
      options: [
        {
          value: "visium",
          labelKey: "submit.detail.options.spatialImage.visium.label",
          subKey: "submit.detail.options.spatialImage.visium.sub",
          effect: { chipAdd: { axis: "spatial-platform", value: "visium" } },
        },
        {
          value: "merfish",
          labelKey: "submit.detail.options.spatialImage.merfish.label",
          subKey: "submit.detail.options.spatialImage.merfish.sub",
          effect: { chipAdd: { axis: "spatial-platform", value: "merfish" } },
        },
      ],
    },
  ],
}

// メタボロミクス → MetaboBank / プロテオミクス → jPOST。生の質量分析だけが分岐する
const massSpectrometryDef: RowFormDef = {
  groups: [domainGroup("massSpectrometry")],
}

export const ROW_FORM_DEFS: Readonly<Record<FileTypeKind, RowFormDef>> = {
  "sequence-read": EMPTY_DEF,
  "sequence-nucleotide": sequenceNucleotideDef,
  "sequence-annotation": sequenceAnnotationDef,
  "variant": EMPTY_DEF,
  "expression-matrix": EMPTY_DEF,
  "microarray-expression": EMPTY_DEF,
  "spatial-transcriptomics": spatialTranscriptomicsDef,
  "spatial-image": spatialImageDef,
  "mass-spectrometry": massSpectrometryDef,
  "nmr": EMPTY_DEF,
  "metabolite-assignment": EMPTY_DEF,
}

// flow-changing 軸を持つ種別だけが file 詳細質問を持つ。持たない種別はデータ詳細セルを出さない
export const hasRowDetail = (kind: FileTypeKind): boolean =>
  ROW_FORM_DEFS[kind].groups.length > 0
