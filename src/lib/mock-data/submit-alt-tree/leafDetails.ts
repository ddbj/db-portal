import type {
  GoalTemplateIdAlt,
  LeafDetailAlt,
  LeafNodeIdAlt,
  MasterRefs,
} from "@/types/submit-alt"

import { STEP_PATTERNS_ALT } from "./goalTemplates"
import {
  LEAF_GOALS_ALT,
  LEAF_VENUE_ALT,
} from "./leafGoals"

const detail = (
  leafId: LeafNodeIdAlt,
  goalTemplateId: GoalTemplateIdAlt,
  masters: MasterRefs = {},
): LeafDetailAlt => ({
  leafId,
  goal: LEAF_GOALS_ALT[leafId],
  goalLabel: LEAF_GOALS_ALT[leafId],
  goalTemplateId,
  venue: LEAF_VENUE_ALT[leafId],
  summaryKey: `routes.submitAlt.detail.leaves.${leafId}.summary`,
  stepKeys: STEP_PATTERNS_ALT[goalTemplateId],
  masters,
})

// 33 leaf の詳細データ。docs/submit-alt.md L321-333 の軸補強情報を masters で表現。
// representative leaf (eukaryote-raw-assembly / prokaryote-raw-assembly / expression-ngs /
// metabolomics / human-restricted / variation 系 / spatial-tx) は masters を完備。
// 残りは段階的に拡充予定（Phase 5 / 後続 issue で対応）。
export const LEAF_DETAILS_ALT: Readonly<Record<LeafNodeIdAlt, LeafDetailAlt>> = {
  "human-restricted": detail("human-restricted", "jga", {
    bpDataTypes: ["Phenotype and Genotype"],
    bsPackages: ["Human"],
    jgaObjectTypes: [
      "Study",
      "Sample",
      "Experiment",
      "Data",
      "Analysis",
      "Dataset",
      "Policy",
    ],
  }),
  "proteomics": detail("proteomics", "external-jpost", {
    bpDataTypes: ["Proteome"],
  }),
  "metabolomics": detail("metabolomics", "metabobank", {
    bpDataTypes: ["Other"],
    metabobankSubmissionTypes: [
      "LC-MS",
      "LC-DAD-MS",
      "GC-MS",
      "GCGC-MS",
      "GC-FID-MS",
      "CE-MS",
      "DI-MS",
      "FIA-MS",
      "MALDI-MS",
      "MSI",
      "NMR",
    ],
  }),
  "variation-nonhuman": detail("variation-nonhuman", "external-eva", {
    bpDataTypes: ["Variation"],
  }),
  "variation-human-open": detail("variation-human-open", "jvar", {
    bpDataTypes: ["Variation"],
    bsPackages: ["Human"],
  }),
  "variation-human-restricted": detail(
    "variation-human-restricted",
    "jga-analysis",
    {
      bpDataTypes: ["Variation"],
      bsPackages: ["Human"],
      jgaObjectTypes: ["Analysis", "Dataset", "Policy"],
    },
  ),
  "expression-ngs": detail("expression-ngs", "gea", {
    bpDataTypes: ["Transcriptome or Gene Expression"],
    bsPackages: ["Model organism or animal", "Plant", "Microbe", "Human"],
    draLibrarySources: ["TRANSCRIPTOMIC", "TRANSCRIPTOMIC SINGLE CELL"],
    draLibraryStrategies: ["RNA-Seq", "miRNA-Seq", "ncRNA-Seq", "ssRNA-seq", "Other"],
    draInstruments: [
      "Illumina NovaSeq",
      "Illumina HiSeq",
      "Illumina NextSeq",
      "Illumina MiSeq",
    ],
    geaSubmissionTypes: ["Sequencing"],
  }),
  "expression-array": detail("expression-array", "gea", {
    bpDataTypes: ["Transcriptome or Gene Expression"],
    geaSubmissionTypes: ["Microarray"],
  }),
  "small-sequence": detail("small-sequence", "nsss", {
    bpDataTypes: ["Targeted Locus", "Other"],
  }),
  "metagenome-raw": detail("metagenome-raw", "genome", {
    bpDataTypes: ["Metagenome"],
    bsPackages: ["Metagenome or environmental", "MIMS.me"],
    draLibrarySources: ["METAGENOMIC", "METATRANSCRIPTOMIC"],
    draLibraryStrategies: ["WGS", "AMPLICON", "Other"],
  }),
  "metagenome-primary": detail("metagenome-primary", "sra-analysis", {
    bpDataTypes: ["Metagenome"],
    bsPackages: ["Metagenome or environmental"],
  }),
  "metagenome-genome-bin": detail("metagenome-genome-bin", "genome", {
    bpDataTypes: ["Metagenome", "Genome Sequencing"],
    bsPackages: ["MIMAG", "MISAG", "MIGS.ba", "MIGS.eu"],
    mssDataTypes: ["MAG", "SAG"],
  }),
  "metagenome-tls": detail("metagenome-tls", "genome", {
    bpDataTypes: ["Targeted Locus", "Metagenome"],
    bsPackages: ["MIMARKS.specimen", "MIMARKS.survey"],
    mssDataTypes: ["TLS"],
  }),
  "metagenome-tsa": detail("metagenome-tsa", "genome", {
    bpDataTypes: ["Transcriptome or Gene Expression", "Metagenome"],
    bsPackages: ["MIMS.me"],
    mssDataTypes: ["TSA"],
  }),
  "human-microbiome-restricted": detail(
    "human-microbiome-restricted",
    "jga-analysis",
    {
      bpDataTypes: ["Metagenome"],
      bsPackages: ["Human", "MIMS.me"],
      jgaObjectTypes: ["Analysis", "Dataset", "Policy"],
    },
  ),
  "organelle-plasmid": detail("organelle-plasmid", "genome", {
    bpDataTypes: ["Genome Sequencing"],
    bsPackages: ["Microbe"],
    mssDataTypes: ["GNM", "WGS"],
  }),
  "prokaryote-raw": detail("prokaryote-raw", "genome", {
    bpDataTypes: ["Genome Sequencing"],
    bsPackages: ["Microbe", "MIGS.ba"],
    draLibrarySources: ["GENOMIC"],
    draLibraryStrategies: ["WGS", "AMPLICON", "Other"],
  }),
  "prokaryote-raw-assembly": detail("prokaryote-raw-assembly", "genome", {
    bpDataTypes: ["Genome Sequencing"],
    bsPackages: ["Microbe", "MIGS.ba"],
    draLibrarySources: ["GENOMIC"],
    draLibraryStrategies: ["WGS", "FINISHING", "Other"],
    draInstruments: [
      "Illumina NovaSeq",
      "Illumina HiSeq",
      "Illumina MiSeq",
      "PacBio Sequel",
      "MinION",
    ],
    mssDataTypes: ["GNM", "WGS"],
  }),
  "prokaryote-assembly-only": detail("prokaryote-assembly-only", "genome", {
    bpDataTypes: ["Genome Sequencing"],
    bsPackages: ["Microbe", "MIGS.ba"],
    mssDataTypes: ["GNM", "WGS"],
  }),
  "virus-raw": detail("virus-raw", "genome", {
    bpDataTypes: ["Genome Sequencing"],
    bsPackages: ["Virus", "MIGS.vi", "MIUVIG"],
    draLibrarySources: ["VIRAL RNA", "GENOMIC"],
    draLibraryStrategies: ["WGS", "AMPLICON"],
  }),
  "virus-raw-assembly": detail("virus-raw-assembly", "genome", {
    bpDataTypes: ["Genome Sequencing"],
    bsPackages: ["Virus", "MIGS.vi", "SARS-CoV-2.cl", "SARS-CoV-2.wwsurv"],
    mssDataTypes: ["GNM", "WGS"],
  }),
  "virus-assembly-only": detail("virus-assembly-only", "genome", {
    bpDataTypes: ["Genome Sequencing"],
    bsPackages: ["Virus", "MIGS.vi"],
    mssDataTypes: ["GNM", "WGS"],
  }),
  "eukaryote-tsa": detail("eukaryote-tsa", "genome", {
    bpDataTypes: ["Transcriptome or Gene Expression"],
    bsPackages: ["Model organism or animal", "Plant"],
    draLibrarySources: ["TRANSCRIPTOMIC"],
    draLibraryStrategies: ["RNA-Seq"],
    mssDataTypes: ["TSA"],
  }),
  "eukaryote-tpa": detail("eukaryote-tpa", "genome", {
    bpDataTypes: ["Genome Sequencing"],
    bsPackages: ["Model organism or animal", "Plant"],
    mssDataTypes: ["TPA"],
  }),
  "eukaryote-raw": detail("eukaryote-raw", "genome", {
    bpDataTypes: ["Genome Sequencing"],
    bsPackages: ["Model organism or animal", "Plant", "Invertebrate"],
    draLibrarySources: ["GENOMIC", "GENOMIC SINGLE CELL"],
    draLibraryStrategies: ["WGS", "AMPLICON", "Other"],
  }),
  "eukaryote-raw-assembly": detail("eukaryote-raw-assembly", "genome", {
    bpDataTypes: ["Genome Sequencing"],
    bsPackages: ["Model organism or animal", "Plant", "Invertebrate", "MIGS.eu"],
    draLibrarySources: ["GENOMIC", "GENOMIC SINGLE CELL"],
    draLibraryStrategies: [
      "WGS",
      "WGA",
      "WCS",
      "FINISHING",
      "Synthetic-Long-Read",
      "Other",
    ],
    draInstruments: [
      "Illumina NovaSeq",
      "Illumina HiSeq",
      "Illumina MiSeq",
      "PacBio Sequel",
      "PromethION",
      "GridION",
      "MinION",
    ],
    mssDataTypes: ["GNM", "WGS", "HTG"],
  }),
  "eukaryote-assembly-only": detail("eukaryote-assembly-only", "genome", {
    bpDataTypes: ["Genome Sequencing"],
    bsPackages: ["Model organism or animal", "Plant", "Invertebrate", "MIGS.eu"],
    mssDataTypes: ["GNM", "WGS", "HTG"],
  }),
  "eukaryote-haplotype-raw-assembly": detail(
    "eukaryote-haplotype-raw-assembly",
    "genome",
    {
      bpDataTypes: ["Genome Sequencing"],
      bsPackages: ["Model organism or animal", "Plant"],
      draLibrarySources: ["GENOMIC"],
      draLibraryStrategies: ["WGS", "Synthetic-Long-Read"],
      mssDataTypes: ["GNM", "WGS"],
    },
  ),
  "eukaryote-haplotype-assembly-only": detail(
    "eukaryote-haplotype-assembly-only",
    "genome",
    {
      bpDataTypes: ["Genome Sequencing"],
      bsPackages: ["Model organism or animal", "Plant"],
      mssDataTypes: ["GNM", "WGS"],
    },
  ),
  "eukaryote-est-small": detail("eukaryote-est-small", "nsss", {
    bpDataTypes: ["Transcriptome or Gene Expression"],
    mssDataTypes: ["EST"],
  }),
  "eukaryote-est-large": detail("eukaryote-est-large", "genome", {
    bpDataTypes: ["Transcriptome or Gene Expression"],
    bsPackages: ["Model organism or animal", "Plant"],
    mssDataTypes: ["EST"],
  }),
  "spatial-tx-nonhuman": detail("spatial-tx-nonhuman", "gea-xenium", {
    bpDataTypes: ["Transcriptome or Gene Expression"],
    bsPackages: ["Model organism or animal", "Plant"],
    geaSubmissionTypes: ["10x Genomics Xenium"],
  }),
  "spatial-tx-restricted": detail("spatial-tx-restricted", "jga-analysis", {
    bpDataTypes: ["Transcriptome or Gene Expression"],
    bsPackages: ["Human"],
    jgaObjectTypes: ["Analysis", "Dataset", "Policy"],
  }),
}
