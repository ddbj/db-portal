import type {
  ChipAxis,
  DataForm,
  FileTypeKind,
  GroupType,
  Q2,
} from "~/schemas/submit"

export type FormOptionEffect = {
  groupType?: GroupType
  dataForm?: DataForm
  chipAdd?: { axis: ChipAxis; value: string }
  chipRemoveAxis?: ChipAxis
  chipRemoveAxes?: ChipAxis[]
  chipClearOnUncheck?: ChipAxis[]
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
  sectionHeadingKey?: string
  kind: "radio" | "check"
  options: readonly FormOptionDef[]
  disabledWhenAnyChip?: readonly { axis: ChipAxis; value: string }[]
  disabledUnlessAnyChip?: readonly { axis: ChipAxis; value: string }[]
}

type RowFormDef = {
  groups: readonly FormGroupDef[]
}

const EMPTY_DEF: RowFormDef = { groups: [] }

const SPECIALIZED_ASSEMBLY_CHIPS: readonly { axis: "assembly-form"; value: string }[] = [
  { axis: "assembly-form", value: "mag" },
  { axis: "assembly-form", value: "sag" },
  { axis: "assembly-form", value: "haplotype" },
]

const sequenceDef: RowFormDef = {
  groups: [
    {
      id: "has-annotation",
      num: "1.",
      labelKey: "submit.detail.formGroupLabels.hasAnnotation",
      sectionHeadingKey: "submit.detail.formGroupLabels.conditionSection",
      kind: "check",
      options: [
        {
          value: "has-annotation",
          labelKey: "submit.detail.options.sequenceNucleotide.hasAnnotation.label",
          subKey: "submit.detail.options.sequenceNucleotide.hasAnnotation.sub",
          effect: { chipAdd: { axis: "has-annotation", value: "true" }, chipClearOnUncheck: ["small-scale"] },
        },
      ],
    },
    {
      id: "tpa",
      num: "",
      labelKey: "submit.detail.formGroupLabels.tpa",
      kind: "check",
      disabledWhenAnyChip: [...SPECIALIZED_ASSEMBLY_CHIPS, { axis: "small-scale", value: "true" }],
      options: [
        {
          value: "tpa",
          labelKey: "submit.detail.options.sequenceNucleotide.tpa.label",
          subKey: "submit.detail.options.sequenceNucleotide.tpa.sub",
          effect: { chipAdd: { axis: "tpa", value: "true" }, chipRemoveAxes: ["small-scale"] },
        },
      ],
    },
    {
      id: "small-scale",
      num: "",
      labelKey: "submit.detail.formGroupLabels.smallScale",
      kind: "check",
      disabledWhenAnyChip: [...SPECIALIZED_ASSEMBLY_CHIPS, { axis: "tpa", value: "true" }],
      disabledUnlessAnyChip: [{ axis: "has-annotation", value: "true" }],
      options: [
        {
          value: "small-scale",
          labelKey: "submit.detail.options.sequenceNucleotide.smallScale.label",
          subKey: "submit.detail.options.sequenceNucleotide.smallScale.sub",
          effect: { chipAdd: { axis: "small-scale", value: "true" }, chipRemoveAxes: ["tpa"] },
        },
      ],
    },
    {
      id: "assembly-form",
      num: "2.",
      labelKey: "submit.detail.formGroupLabels.assemblyForm",
      kind: "radio",
      options: [
        {
          value: "genome",
          labelKey: "submit.detail.options.sequenceNucleotide.genome.label",
          subKey: "submit.detail.options.sequenceNucleotide.genome.sub",
          effect: { chipAdd: { axis: "assembly-form", value: "genome" } },
        },
        {
          value: "mag-chain",
          labelKey: "submit.detail.options.sequenceNucleotide.magChain.label",
          subKey: "submit.detail.options.sequenceNucleotide.magChain.sub",
          effect: { chipAdd: { axis: "assembly-form", value: "mag" }, chipRemoveAxes: ["tpa", "small-scale"] },
        },
        {
          value: "sag-chain",
          labelKey: "submit.detail.options.sequenceNucleotide.sagChain.label",
          subKey: "submit.detail.options.sequenceNucleotide.sagChain.sub",
          effect: { chipAdd: { axis: "assembly-form", value: "sag" }, chipRemoveAxes: ["tpa", "small-scale"] },
        },
        {
          value: "haplotype",
          labelKey: "submit.detail.options.sequenceNucleotide.haplotype.label",
          subKey: "submit.detail.options.sequenceNucleotide.haplotype.sub",
          effect: { chipAdd: { axis: "assembly-form", value: "haplotype" }, chipRemoveAxes: ["tpa", "small-scale"] },
        },
      ],
    },
  ],
}

const expressionMatrixDef: RowFormDef = {
  groups: [
    {
      id: "expression-source",
      num: "1.",
      labelKey: "submit.detail.formGroupLabels.expressionSource",
      kind: "radio",
      options: [
        {
          value: "ngs",
          labelKey: "submit.detail.options.expressionMatrix.ngs.label",
          subKey: "submit.detail.options.expressionMatrix.ngs.sub",
          effect: { chipAdd: { axis: "expression-source", value: "ngs" } },
        },
        {
          value: "non-ngs",
          labelKey: "submit.detail.options.expressionMatrix.nonNgs.label",
          subKey: "submit.detail.options.expressionMatrix.nonNgs.sub",
          effect: { chipRemoveAxis: "expression-source" },
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

const BASE_ROW_FORM_DEFS: Readonly<Record<FileTypeKind, RowFormDef>> = {
  "sequence-read": EMPTY_DEF,
  "sequence": sequenceDef,
  "variant": EMPTY_DEF,
  "expression-matrix": expressionMatrixDef,
  "microarray-expression": EMPTY_DEF,
  "spatial-transcriptomics": spatialTranscriptomicsDef,
  "metabolomics": EMPTY_DEF,
  "proteome": EMPTY_DEF,
}

type IdentifiabilityCopy = { labelKey: string; subKey: string }
type IdentifiabilityEntry = { exclude: IdentifiabilityCopy; include: IdentifiabilityCopy }

const IDENTIFIABILITY_KEYS: Partial<Record<FileTypeKind, IdentifiabilityEntry>> = {
  "sequence-read": {
    exclude: {
      labelKey: "submit.detail.options.identifiability.sequenceRead.exclude.label",
      subKey: "submit.detail.options.identifiability.sequenceRead.exclude.sub",
    },
    include: {
      labelKey: "submit.detail.options.identifiability.sequenceRead.include.label",
      subKey: "submit.detail.options.identifiability.sequenceRead.include.sub",
    },
  },
  "sequence": {
    exclude: {
      labelKey: "submit.detail.options.identifiability.sequence.exclude.label",
      subKey: "submit.detail.options.identifiability.sequence.exclude.sub",
    },
    include: {
      labelKey: "submit.detail.options.identifiability.sequence.include.label",
      subKey: "submit.detail.options.identifiability.sequence.include.sub",
    },
  },
  "variant": {
    exclude: {
      labelKey: "submit.detail.options.identifiability.variant.exclude.label",
      subKey: "submit.detail.options.identifiability.variant.exclude.sub",
    },
    include: {
      labelKey: "submit.detail.options.identifiability.variant.include.label",
      subKey: "submit.detail.options.identifiability.variant.include.sub",
    },
  },
}

const countVisualSections = (groups: readonly FormGroupDef[]): number => {
  let count = 0
  let inToggleSection = false
  for (const g of groups) {
    if (g.sectionHeadingKey !== undefined) {
      count++
      inToggleSection = true
    } else if (inToggleSection && g.kind === "check" && g.options.length === 1) {
      // still part of the toggle section
    } else {
      count++
      inToggleSection = false
    }
  }
  return count
}

export const getRowFormDef = (
  kind: FileTypeKind,
  q2: Q2 | null,
  hasIdentifier: boolean,
): RowFormDef => {
  const base = BASE_ROW_FORM_DEFS[kind]
  const entry = IDENTIFIABILITY_KEYS[kind]
  if (q2 === "human" && entry !== undefined) {
    const num = `${countVisualSections(base.groups) + 1}.`
    const copy = hasIdentifier ? entry.exclude : entry.include
    const value = hasIdentifier ? "non-identifiable" : "identifiable"
    const group: FormGroupDef = {
      id: "identifiability",
      num,
      labelKey: "submit.detail.formGroupLabels.identifiability",
      kind: "check",
      options: [{
        value,
        labelKey: copy.labelKey,
        subKey: copy.subKey,
        effect: { chipAdd: { axis: "identifiability", value } },
      }],
    }
    return { groups: [...base.groups, group] }
  }
  return base
}

// flow-changing 軸を持つ種別だけが file 詳細質問を持つ。持たない種別はデータ詳細セルを出さない。
// identifiability section の有無は groups.length に影響しない (Yes/No いずれでも 1 section) ため
// 判定はどちらの hasIdentifier 値でも同じ結果になる
export const hasRowDetail = (kind: FileTypeKind, q2: Q2 | null): boolean =>
  getRowFormDef(kind, q2, true).groups.length > 0
