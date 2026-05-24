import type {
  ButtonType,
  ChipAxis,
  DataForm,
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
          effect: { chipRemoveAxis: "haplotype-mode" },
        },
        {
          value: "multiplex",
          labelKey: "submit.modal.options.sequenceRead.multiplex.label",
          subKey: "submit.modal.options.sequenceRead.multiplex.sub",
          effect: { groupType: "multiplex" },
        },
      ],
    },
    {
      id: "analysisOutput",
      num: "3.",
      labelKey: "submit.modal.formGroupLabels.analysisOutput",
      kind: "check",
      options: [
        {
          value: "gea",
          labelKey: "submit.modal.options.sequenceRead.geaPair.label",
          subKey: "submit.modal.options.sequenceRead.geaPair.sub",
          effect: { chipAdd: { axis: "functional-genomics", value: "rna-seq" } },
        },
      ],
    },
  ],
}

const assembledDef: RowFormDef = {
  groups: [
    {
      id: "form",
      num: "1.",
      labelKey: "submit.modal.formGroupLabels.form",
      kind: "radio",
      options: [
        {
          value: "assembled",
          labelKey: "submit.modal.options.assembled.assembled.label",
          subKey: "submit.modal.options.assembled.assembled.sub",
          effect: { groupType: "single", dataForm: "assembled" },
        },
        {
          value: "hybrid",
          labelKey: "submit.modal.options.assembled.hybrid.label",
          subKey: "submit.modal.options.assembled.hybrid.sub",
          effect: { groupType: "hybrid", dataForm: "assembled" },
        },
        {
          value: "mag-sag-chain",
          labelKey: "submit.modal.options.assembled.magSag.label",
          subKey: "submit.modal.options.assembled.magSag.sub",
          effect: { groupType: "mag-sag-chain", dataForm: "assembled" },
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
          labelKey: "submit.modal.options.assembled.annotationPair.label",
          subKey: "submit.modal.options.assembled.annotationPair.sub",
          effect: { groupType: "assembly-annotation" },
        },
      ],
    },
    {
      id: "provenance",
      num: "3.",
      labelKey: "submit.modal.formGroupLabels.provenance",
      kind: "radio",
      options: [
        {
          value: "first-party",
          labelKey: "submit.modal.options.assembled.firstParty.label",
          subKey: "submit.modal.options.assembled.firstParty.sub",
          effect: { chipRemoveAxis: "provenance" },
        },
        {
          value: "third-party",
          labelKey: "submit.modal.options.assembled.thirdParty.label",
          subKey: "submit.modal.options.assembled.thirdParty.sub",
          effect: { chipAdd: { axis: "provenance", value: "third-party" } },
        },
      ],
    },
  ],
}

const geneAnnotationDef: RowFormDef = {
  groups: [
    {
      id: "target",
      num: "1.",
      labelKey: "submit.modal.formGroupLabels.target",
      kind: "radio",
      options: [
        {
          value: "assembly-pair",
          labelKey: "submit.modal.options.geneAnnotation.assemblyPair.label",
          subKey: "submit.modal.options.geneAnnotation.assemblyPair.sub",
          effect: { groupType: "assembly-annotation" },
        },
        {
          value: "standalone",
          labelKey: "submit.modal.options.geneAnnotation.standalone.label",
          subKey: "submit.modal.options.geneAnnotation.standalone.sub",
          effect: { groupType: "single" },
        },
      ],
    },
    {
      id: "provenance",
      num: "2.",
      labelKey: "submit.modal.formGroupLabels.provenance",
      kind: "radio",
      options: [
        {
          value: "first-party",
          labelKey: "submit.modal.options.geneAnnotation.firstParty.label",
          subKey: "submit.modal.options.geneAnnotation.firstParty.sub",
          effect: { chipRemoveAxis: "provenance" },
        },
        {
          value: "third-party",
          labelKey: "submit.modal.options.geneAnnotation.thirdParty.label",
          subKey: "submit.modal.options.geneAnnotation.thirdParty.sub",
          effect: { chipAdd: { axis: "provenance", value: "third-party" } },
        },
      ],
    },
  ],
}

const variationDef: RowFormDef = {
  groups: [
    {
      id: "form",
      num: "1.",
      labelKey: "submit.modal.formGroupLabels.form",
      kind: "radio",
      options: [
        {
          value: "per-sample",
          labelKey: "submit.modal.options.variation.perSample.label",
          subKey: "submit.modal.options.variation.perSample.sub",
          effect: { chipAdd: { axis: "variation-form", value: "per-sample" } },
        },
        {
          value: "aggregate",
          labelKey: "submit.modal.options.variation.aggregate.label",
          subKey: "submit.modal.options.variation.aggregate.sub",
          effect: { chipAdd: { axis: "variation-form", value: "aggregate" } },
        },
      ],
    },
    {
      id: "reference",
      num: "2.",
      labelKey: "submit.modal.formGroupLabels.reference",
      kind: "radio",
      options: [
        {
          value: "with",
          labelKey: "submit.modal.options.variation.withRef.label",
          subKey: "submit.modal.options.variation.withRef.sub",
          effect: { groupType: "variation-with-reference" },
        },
        {
          value: "without",
          labelKey: "submit.modal.options.variation.withoutRef.label",
          subKey: "submit.modal.options.variation.withoutRef.sub",
          effect: { groupType: "single" },
        },
      ],
    },
  ],
}

const phenotypeDef: RowFormDef = {
  groups: [
    {
      id: "phenotypeType",
      num: "1.",
      labelKey: "submit.modal.formGroupLabels.phenotypeType",
      kind: "radio",
      options: [
        {
          value: "clinical",
          labelKey: "submit.modal.options.phenotype.clinical.label",
          subKey: "submit.modal.options.phenotype.clinical.sub",
          effect: { chipAdd: { axis: "host-pathogen", value: "clinical" } },
        },
        {
          value: "model-organism",
          labelKey: "submit.modal.options.phenotype.modelOrganism.label",
          subKey: "submit.modal.options.phenotype.modelOrganism.sub",
          effect: { chipRemoveAxis: "host-pathogen" },
        },
      ],
    },
    {
      id: "dataForm",
      num: "2.",
      labelKey: "submit.modal.formGroupLabels.dataForm",
      kind: "radio",
      options: [
        {
          value: "raw",
          labelKey: "submit.modal.options.phenotype.raw.label",
          subKey: "submit.modal.options.phenotype.raw.sub",
          effect: { dataForm: "phenotype" },
        },
        {
          value: "summary",
          labelKey: "submit.modal.options.phenotype.summary.label",
          subKey: "submit.modal.options.phenotype.summary.sub",
          effect: { dataForm: "analysis-output" },
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

const rnaSeqMatrixDef: RowFormDef = {
  groups: [
    {
      id: "dataForm",
      num: "1.",
      labelKey: "submit.modal.formGroupLabels.dataForm",
      kind: "radio",
      options: [
        {
          value: "raw-counts",
          labelKey: "submit.modal.options.rnaSeq.rawCounts.label",
          subKey: "submit.modal.options.rnaSeq.rawCounts.sub",
          effect: { dataForm: "matrix" },
        },
        {
          value: "normalized",
          labelKey: "submit.modal.options.rnaSeq.normalized.label",
          subKey: "submit.modal.options.rnaSeq.normalized.sub",
          effect: { dataForm: "analysis-output" },
        },
      ],
    },
  ],
}

const massSpecDef: RowFormDef = {
  groups: [
    {
      id: "domain",
      num: "1.",
      labelKey: "submit.modal.formGroupLabels.domain",
      kind: "radio",
      options: [
        {
          value: "proteomics",
          labelKey: "submit.modal.options.massSpec.proteomics.label",
          subKey: "submit.modal.options.massSpec.proteomics.sub",
          effect: { chipAdd: { axis: "mass-spec-domain", value: "proteomics" } },
        },
        {
          value: "metabolomics",
          labelKey: "submit.modal.options.massSpec.metabolomics.label",
          subKey: "submit.modal.options.massSpec.metabolomics.sub",
          effect: { chipAdd: { axis: "mass-spec-domain", value: "metabolomics" } },
        },
      ],
    },
    {
      id: "method",
      num: "2.",
      labelKey: "submit.modal.formGroupLabels.method",
      kind: "radio",
      options: [
        {
          value: "shotgun",
          labelKey: "submit.modal.options.massSpec.shotgun.label",
          subKey: "submit.modal.options.massSpec.shotgun.sub",
          effect: { groupType: "single" },
        },
        {
          value: "imaging",
          labelKey: "submit.modal.options.massSpec.imaging.label",
          subKey: "submit.modal.options.massSpec.imaging.sub",
          effect: { groupType: "imaging-ms" },
        },
      ],
    },
  ],
}

const spatialDef: RowFormDef = {
  groups: [
    {
      id: "platform",
      num: "1.",
      labelKey: "submit.modal.formGroupLabels.platform",
      kind: "radio",
      options: [
        {
          value: "visium",
          labelKey: "submit.modal.options.spatial.visium.label",
          subKey: "submit.modal.options.spatial.visium.sub",
          effect: { chipAdd: { axis: "spatial-platform", value: "visium" } },
        },
        {
          value: "stereo-seq",
          labelKey: "submit.modal.options.spatial.stereoSeq.label",
          subKey: "submit.modal.options.spatial.stereoSeq.sub",
          effect: { chipAdd: { axis: "spatial-platform", value: "stereo-seq" } },
        },
      ],
    },
    {
      id: "stage",
      num: "2.",
      labelKey: "submit.modal.formGroupLabels.stage",
      kind: "radio",
      options: [
        {
          value: "raw",
          labelKey: "submit.modal.options.spatial.raw.label",
          subKey: "submit.modal.options.spatial.raw.sub",
          effect: { dataForm: "matrix" },
        },
        {
          value: "analysis-output",
          labelKey: "submit.modal.options.spatial.analysis.label",
          subKey: "submit.modal.options.spatial.analysis.sub",
          effect: { dataForm: "analysis-output" },
        },
      ],
    },
  ],
}

export const ROW_FORM_DEFS: Readonly<Record<ButtonType, RowFormDef>> = {
  "sequence-read": sequenceReadDef,
  "assembled": assembledDef,
  "gene-annotation": geneAnnotationDef,
  "variation": variationDef,
  "phenotype": phenotypeDef,
  "microarray-expression": microarrayDef,
  "rna-seq-matrix": rnaSeqMatrixDef,
  "mass-spec": massSpecDef,
  "spatial-tx": spatialDef,
}

