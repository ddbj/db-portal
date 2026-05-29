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

// 行追加時に自動採番する default filename の buttonType ごとの prefix と拡張子
export const BUTTON_DEFAULT_FILENAME: Readonly<
  Record<ButtonType, { prefix: string; ext: string }>
> = {
  "sequence-read": { prefix: "read", ext: "fastq" },
  "assembled": { prefix: "asm", ext: "fasta" },
  "gene-annotation": { prefix: "ann", ext: "gff" },
  "variation": { prefix: "var", ext: "vcf" },
  "phenotype": { prefix: "phe", ext: "tsv" },
  "microarray-expression": { prefix: "arr", ext: "cel" },
  "rna-seq-matrix": { prefix: "mtx", ext: "tsv" },
  "mass-spec": { prefix: "ms", ext: "mzML" },
  "spatial-tx": { prefix: "spt", ext: "tsv" },
}

export const ALLOWED_CHIP_VALUES: Readonly<Record<ChipAxis, readonly string[]>> = {
  "assembly-form": ["raw", "primary", "binned", "mag", "sag", "hybrid"],
  "provenance": ["third-party"],
  "variation-form": ["per-sample", "aggregate"],
  "host-pathogen": ["clinical"],
  "haplotype-mode": [],
  "functional-genomics": ["rna-seq"],
  "mass-spec-domain": ["proteomics", "metabolomics"],
  "spatial-platform": ["visium", "stereo-seq"],
  "tpa-subtype": ["tpa"],
  "mag-sag-chain": [],
}

export const isAllowedChipValue = (axis: ChipAxis, value: string): boolean =>
  ALLOWED_CHIP_VALUES[axis].includes(value)
