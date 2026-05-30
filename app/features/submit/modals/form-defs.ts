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

const provenanceGroup = (kindKey: string, num: string): FormGroupDef => ({
  id: "provenance",
  num,
  labelKey: "submit.modal.formGroupLabels.provenance",
  kind: "radio",
  options: [
    {
      value: "first-party",
      labelKey: `submit.modal.options.${kindKey}.firstParty.label`,
      subKey: `submit.modal.options.${kindKey}.firstParty.sub`,
      effect: { chipRemoveAxis: "provenance" },
    },
    {
      value: "third-party",
      labelKey: `submit.modal.options.${kindKey}.thirdParty.label`,
      subKey: `submit.modal.options.${kindKey}.thirdParty.sub`,
      effect: { chipAdd: { axis: "provenance", value: "third-party" } },
    },
  ],
})

const domainGroup = (kindKey: string): FormGroupDef => ({
  id: "domain",
  num: "1.",
  labelKey: "submit.modal.formGroupLabels.domain",
  kind: "radio",
  options: [
    {
      value: "metabolomics",
      labelKey: `submit.modal.options.${kindKey}.metabolomics.label`,
      subKey: `submit.modal.options.${kindKey}.metabolomics.sub`,
      effect: { chipAdd: { axis: "mass-spec-domain", value: "metabolomics" } },
    },
    {
      value: "proteomics",
      labelKey: `submit.modal.options.${kindKey}.proteomics.label`,
      subKey: `submit.modal.options.${kindKey}.proteomics.sub`,
      effect: { chipAdd: { axis: "mass-spec-domain", value: "proteomics" } },
    },
  ],
})

const sequenceReadDef: RowFormDef = {
  groups: [
    {
      id: "structure",
      num: "1.",
      labelKey: "submit.modal.formGroupLabels.structure",
      kind: "radio",
      options: [
        {
          value: "single",
          labelKey: "submit.modal.options.sequenceRead.singleEnd.label",
          subKey: "submit.modal.options.sequenceRead.singleEnd.sub",
          effect: { groupType: "single" },
        },
        {
          value: "pair-end",
          labelKey: "submit.modal.options.sequenceRead.pairEnd.label",
          subKey: "submit.modal.options.sequenceRead.pairEnd.sub",
          effect: { groupType: "pair-end" },
        },
        {
          value: "10x",
          labelKey: "submit.modal.options.sequenceRead.tenx.label",
          subKey: "submit.modal.options.sequenceRead.tenx.sub",
          effect: { groupType: "10x" },
        },
        {
          value: "pacbio-hdf5",
          labelKey: "submit.modal.options.sequenceRead.pacbio.label",
          subKey: "submit.modal.options.sequenceRead.pacbio.sub",
          effect: { groupType: "pacbio-hdf5" },
        },
      ],
    },
    {
      id: "multiplex",
      num: "2.",
      labelKey: "submit.modal.formGroupLabels.multiplex",
      kind: "radio",
      options: [
        {
          value: "per-sample",
          labelKey: "submit.modal.options.sequenceRead.perSample.label",
          subKey: "submit.modal.options.sequenceRead.perSample.sub",
          effect: {},
        },
        {
          value: "multiplex",
          labelKey: "submit.modal.options.sequenceRead.multiplex.label",
          subKey: "submit.modal.options.sequenceRead.multiplex.sub",
          effect: { groupType: "multiplex" },
        },
      ],
    },
  ],
}

const sequenceNucleotideDef: RowFormDef = {
  groups: [
    {
      id: "form",
      num: "1.",
      labelKey: "submit.modal.formGroupLabels.form",
      kind: "radio",
      options: [
        {
          value: "single",
          labelKey: "submit.modal.options.sequenceNucleotide.standalone.label",
          subKey: "submit.modal.options.sequenceNucleotide.standalone.sub",
          effect: { groupType: "single" },
        },
        {
          value: "hybrid",
          labelKey: "submit.modal.options.sequenceNucleotide.hybrid.label",
          subKey: "submit.modal.options.sequenceNucleotide.hybrid.sub",
          effect: { groupType: "hybrid" },
        },
        {
          value: "mag-chain",
          labelKey: "submit.modal.options.sequenceNucleotide.magChain.label",
          subKey: "submit.modal.options.sequenceNucleotide.magChain.sub",
          effect: { groupType: "mag-sag-chain", chipAdd: { axis: "assembly-form", value: "mag" } },
        },
        {
          value: "sag-chain",
          labelKey: "submit.modal.options.sequenceNucleotide.sagChain.label",
          subKey: "submit.modal.options.sequenceNucleotide.sagChain.sub",
          effect: { groupType: "mag-sag-chain", chipAdd: { axis: "assembly-form", value: "sag" } },
        },
      ],
    },
    {
      id: "annotationPair",
      num: "2.",
      labelKey: "submit.modal.formGroupLabels.annotationPair",
      kind: "check",
      options: [
        {
          value: "pair",
          labelKey: "submit.modal.options.sequenceNucleotide.annotationPair.label",
          subKey: "submit.modal.options.sequenceNucleotide.annotationPair.sub",
          effect: { groupType: "assembly-annotation" },
        },
      ],
    },
    provenanceGroup("sequenceNucleotide", "3."),
  ],
}

const sequenceAnnotationDef: RowFormDef = {
  groups: [
    {
      id: "target",
      num: "1.",
      labelKey: "submit.modal.formGroupLabels.target",
      kind: "radio",
      options: [
        {
          value: "assembly-pair",
          labelKey: "submit.modal.options.sequenceAnnotation.assemblyPair.label",
          subKey: "submit.modal.options.sequenceAnnotation.assemblyPair.sub",
          effect: { groupType: "assembly-annotation" },
        },
        {
          value: "standalone",
          labelKey: "submit.modal.options.sequenceAnnotation.standalone.label",
          subKey: "submit.modal.options.sequenceAnnotation.standalone.sub",
          effect: { groupType: "single" },
        },
      ],
    },
    provenanceGroup("sequenceAnnotation", "2."),
  ],
}

// per-sample/aggregate と SNP/SV は出る service を変えない (TogoVar/EVA 内の登録種別差) ため
// データ詳細 chip にせず Step カードの Intra-DB Tag で扱う。modal はリファレンスの有無だけ確定する。
const variantDef: RowFormDef = {
  groups: [
    {
      id: "reference",
      num: "1.",
      labelKey: "submit.modal.formGroupLabels.reference",
      kind: "radio",
      options: [
        {
          value: "with",
          labelKey: "submit.modal.options.variant.withRef.label",
          subKey: "submit.modal.options.variant.withRef.sub",
          effect: { groupType: "variation-with-reference" },
        },
        {
          value: "without",
          labelKey: "submit.modal.options.variant.withoutRef.label",
          subKey: "submit.modal.options.variant.withoutRef.sub",
          effect: { groupType: "single" },
        },
      ],
    },
  ],
}

const expressionMatrixDef: RowFormDef = {
  groups: [
    {
      id: "structure",
      num: "1.",
      labelKey: "submit.modal.formGroupLabels.structure",
      kind: "radio",
      options: [
        {
          value: "single",
          labelKey: "submit.modal.options.expressionMatrix.standalone.label",
          subKey: "submit.modal.options.expressionMatrix.standalone.sub",
          effect: { groupType: "single" },
        },
        {
          value: "mage-tab",
          labelKey: "submit.modal.options.expressionMatrix.mageTab.label",
          subKey: "submit.modal.options.expressionMatrix.mageTab.sub",
          effect: { groupType: "mage-tab" },
        },
      ],
    },
  ],
}

const microarrayDef: RowFormDef = {
  groups: [
    {
      id: "platform",
      num: "1.",
      labelKey: "submit.modal.formGroupLabels.platform",
      kind: "radio",
      options: [
        {
          value: "single-color",
          labelKey: "submit.modal.options.microarray.singleColor.label",
          subKey: "submit.modal.options.microarray.singleColor.sub",
          effect: { groupType: "mage-tab" },
        },
        {
          value: "two-color",
          labelKey: "submit.modal.options.microarray.twoColor.label",
          subKey: "submit.modal.options.microarray.twoColor.sub",
          effect: { groupType: "two-color" },
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
      labelKey: "submit.modal.formGroupLabels.platform",
      kind: "radio",
      options: [
        {
          value: "visium",
          labelKey: "submit.modal.options.spatialTranscriptomics.visium.label",
          subKey: "submit.modal.options.spatialTranscriptomics.visium.sub",
          effect: { chipAdd: { axis: "spatial-platform", value: "visium" } },
        },
        {
          value: "xenium",
          labelKey: "submit.modal.options.spatialTranscriptomics.xenium.label",
          subKey: "submit.modal.options.spatialTranscriptomics.xenium.sub",
          effect: { chipAdd: { axis: "spatial-platform", value: "xenium" } },
        },
        {
          value: "merfish",
          labelKey: "submit.modal.options.spatialTranscriptomics.merfish.label",
          subKey: "submit.modal.options.spatialTranscriptomics.merfish.sub",
          effect: { chipAdd: { axis: "spatial-platform", value: "merfish" } },
        },
        {
          value: "stereo-seq",
          labelKey: "submit.modal.options.spatialTranscriptomics.stereoSeq.label",
          subKey: "submit.modal.options.spatialTranscriptomics.stereoSeq.sub",
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
      labelKey: "submit.modal.formGroupLabels.platform",
      kind: "radio",
      options: [
        {
          value: "visium",
          labelKey: "submit.modal.options.spatialImage.visium.label",
          subKey: "submit.modal.options.spatialImage.visium.sub",
          effect: { chipAdd: { axis: "spatial-platform", value: "visium" } },
        },
        {
          value: "merfish",
          labelKey: "submit.modal.options.spatialImage.merfish.label",
          subKey: "submit.modal.options.spatialImage.merfish.sub",
          effect: { chipAdd: { axis: "spatial-platform", value: "merfish" } },
        },
      ],
    },
  ],
}

const massSpectrometryDef: RowFormDef = {
  groups: [
    domainGroup("massSpectrometry"),
    {
      id: "method",
      num: "2.",
      labelKey: "submit.modal.formGroupLabels.method",
      kind: "radio",
      options: [
        {
          value: "standard",
          labelKey: "submit.modal.options.massSpectrometry.standard.label",
          subKey: "submit.modal.options.massSpectrometry.standard.sub",
          effect: { groupType: "single" },
        },
        {
          value: "imaging",
          labelKey: "submit.modal.options.massSpectrometry.imaging.label",
          subKey: "submit.modal.options.massSpectrometry.imaging.sub",
          effect: { groupType: "imaging-ms" },
        },
      ],
    },
  ],
}

const nmrDef: RowFormDef = {
  groups: [domainGroup("nmr")],
}

const metaboliteAssignmentDef: RowFormDef = {
  groups: [domainGroup("metaboliteAssignment")],
}

export const ROW_FORM_DEFS: Readonly<Record<FileTypeKind, RowFormDef>> = {
  "sequence-read": sequenceReadDef,
  "sequence-nucleotide": sequenceNucleotideDef,
  "sequence-annotation": sequenceAnnotationDef,
  "variant": variantDef,
  "expression-matrix": expressionMatrixDef,
  "microarray-expression": microarrayDef,
  "spatial-transcriptomics": spatialTranscriptomicsDef,
  "spatial-image": spatialImageDef,
  "mass-spectrometry": massSpectrometryDef,
  "nmr": nmrDef,
  "metabolite-assignment": metaboliteAssignmentDef,
}
