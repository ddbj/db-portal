import { z } from "zod"

export const ButtonType = z.enum([
  "sequence-read",
  "assembled",
  "gene-annotation",
  "variation",
  "phenotype",
  "microarray-expression",
  "rna-seq-matrix",
  "mass-spec",
  "spatial-tx",
])
export type ButtonType = z.infer<typeof ButtonType>

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

export const Organism = z.enum([
  "human",
  "human-microbiome",
  "eukaryote",
  "prokaryote",
  "virus",
  "metagenome",
  "organelle-plasmid",
])
export type Organism = z.infer<typeof Organism>

export const Access = z.enum(["open", "restricted"])
export type Access = z.infer<typeof Access>

export const DataForm = z.enum([
  "raw",
  "assembled",
  "analysis-output",
  "matrix",
  "annotation",
  "mass-spec",
  "phenotype",
])
export type DataForm = z.infer<typeof DataForm>

export const ChipAxis = z.enum([
  "assembly-form",
  "provenance",
  "variation-form",
  "host-pathogen",
  "haplotype-mode",
  "functional-genomics",
  "mass-spec-domain",
  "spatial-platform",
  "tpa-subtype",
  "mag-sag-chain",
])
export type ChipAxis = z.infer<typeof ChipAxis>

export const TYPICAL_DATA_FORM_FOR_BUTTON: Readonly<Record<ButtonType, DataForm>> = {
  "sequence-read": "raw",
  "assembled": "assembled",
  "gene-annotation": "annotation",
  "variation": "analysis-output",
  "phenotype": "phenotype",
  "microarray-expression": "matrix",
  "rna-seq-matrix": "matrix",
  "mass-spec": "mass-spec",
  "spatial-tx": "matrix",
}

export const TYPICAL_GROUP_TYPE_FOR_BUTTON: Readonly<Record<ButtonType, GroupType>> = {
  "sequence-read": "single",
  "assembled": "single",
  "gene-annotation": "single",
  "variation": "variation-with-reference",
  "phenotype": "single",
  "microarray-expression": "mage-tab",
  "rna-seq-matrix": "mage-tab",
  "mass-spec": "single",
  "spatial-tx": "single",
}
