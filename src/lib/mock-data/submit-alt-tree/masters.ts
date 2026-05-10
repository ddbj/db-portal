// 軸補強情報のマスタ。docs/submit-alt.md L321-333 参照。
// label は controlled term（英語）固定。日本語訳は持たない。

export const BP_DATA_TYPES = [
  "Genome Sequencing",
  "Metagenome",
  "Variation",
  "Transcriptome or Gene Expression",
  "Proteome",
  "Phenotype and Genotype",
  "Epigenomics",
  "Exome",
  "Map",
  "Clone Ends",
  "Random Survey",
  "Targeted Locus",
  "Other",
] as const

export type BPDataType = (typeof BP_DATA_TYPES)[number]

export const BS_PACKAGES_STANDARD = [
  "Microbe",
  "Model organism or animal",
  "Metagenome or environmental",
  "Invertebrate",
  "Human",
  "Plant",
  "Virus",
  "Beta-lactamase",
  "Omics",
  "SARS-CoV-2.cl",
  "SARS-CoV-2.wwsurv",
] as const

export const BS_PACKAGES_PATHOGEN = [
  "Pathogen: clinical or host-associated",
  "Pathogen: environmental/food/other",
] as const

export const BS_PACKAGES_MIXS = [
  "MIGS.ba",
  "MIGS.eu",
  "MIGS.vi",
  "MIMS.me",
  "MIMAG",
  "MISAG",
  "MIMARKS.specimen",
  "MIMARKS.survey",
  "MIUVIG",
] as const

export const BS_PACKAGES = [
  ...BS_PACKAGES_STANDARD,
  ...BS_PACKAGES_PATHOGEN,
  ...BS_PACKAGES_MIXS,
] as const

export type BSPackage = (typeof BS_PACKAGES)[number]

export type BSPackageCategory = "standard" | "pathogen" | "mixs"

export const BS_PACKAGE_CATEGORY: Readonly<Record<BSPackage, BSPackageCategory>> = {
  "Microbe": "standard",
  "Model organism or animal": "standard",
  "Metagenome or environmental": "standard",
  "Invertebrate": "standard",
  "Human": "standard",
  "Plant": "standard",
  "Virus": "standard",
  "Beta-lactamase": "standard",
  "Omics": "standard",
  "SARS-CoV-2.cl": "standard",
  "SARS-CoV-2.wwsurv": "standard",
  "Pathogen: clinical or host-associated": "pathogen",
  "Pathogen: environmental/food/other": "pathogen",
  "MIGS.ba": "mixs",
  "MIGS.eu": "mixs",
  "MIGS.vi": "mixs",
  "MIMS.me": "mixs",
  "MIMAG": "mixs",
  "MISAG": "mixs",
  "MIMARKS.specimen": "mixs",
  "MIMARKS.survey": "mixs",
  "MIUVIG": "mixs",
}

export const DRA_LIBRARY_SOURCES = [
  "GENOMIC",
  "GENOMIC SINGLE CELL",
  "TRANSCRIPTOMIC",
  "TRANSCRIPTOMIC SINGLE CELL",
  "METAGENOMIC",
  "METATRANSCRIPTOMIC",
  "SYNTHETIC",
  "VIRAL RNA",
  "OTHER",
] as const

export type DRALibrarySource = (typeof DRA_LIBRARY_SOURCES)[number]

export const DRA_LIBRARY_STRATEGIES = [
  "WGS",
  "WGA",
  "WXS",
  "RNA-Seq",
  "miRNA-Seq",
  "ncRNA-Seq",
  "ssRNA-seq",
  "WCS",
  "CLONE",
  "POOLCLONE",
  "AMPLICON",
  "CLONEEND",
  "FINISHING",
  "RAD-Seq",
  "ChIP-Seq",
  "MNase-Seq",
  "DNase-Hypersensitivity",
  "Bisulfite-Seq",
  "EST",
  "FL-cDNA",
  "CTS",
  "MRE-Seq",
  "MeDIP-Seq",
  "MBD-Seq",
  "Tn-Seq",
  "FAIRE-seq",
  "SELEX",
  "NOMe-Seq",
  "RIP-Seq",
  "ChIA-PET",
  "Hi-C",
  "ATAC-seq",
  "Targeted-Capture",
  "Tethered Chromatin Conformation Capture",
  "Synthetic-Long-Read",
  "Other",
] as const

export type DRALibraryStrategy = (typeof DRA_LIBRARY_STRATEGIES)[number]

export const DRA_INSTRUMENTS = [
  "Illumina NovaSeq",
  "Illumina HiSeq",
  "HiSeq X",
  "Illumina NextSeq",
  "Illumina MiSeq",
  "454 GS FLX",
  "PacBio RS",
  "PacBio Sequel",
  "Ion Torrent PGM",
  "Ion Torrent Proton",
  "MinION",
  "GridION",
  "PromethION",
  "Element AVITI",
  "Other",
] as const

export type DRAInstrument = (typeof DRA_INSTRUMENTS)[number]

export const GEA_SUBMISSION_TYPES = [
  "Sequencing",
  "Microarray",
  "10x Genomics Xenium",
] as const

export type GEASubmissionType = (typeof GEA_SUBMISSION_TYPES)[number]

export const METABOBANK_SUBMISSION_TYPES = [
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
] as const

export type MetaboBankSubmissionType = (typeof METABOBANK_SUBMISSION_TYPES)[number]

export const JGA_OBJECT_TYPES = [
  "Study",
  "Sample",
  "Experiment",
  "Data",
  "Analysis",
  "Dataset",
  "Policy",
] as const

export type JGAObjectType = (typeof JGA_OBJECT_TYPES)[number]

export const MSS_DATA_TYPES = [
  "WGS",
  "GNM",
  "MAG",
  "SAG",
  "TLS",
  "HTG",
  "TSA",
  "HTC",
  "EST",
  "MISC",
  "ASK",
  "TPA",
] as const

export type MSSDataType = (typeof MSS_DATA_TYPES)[number]
