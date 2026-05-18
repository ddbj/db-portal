// submit-alt3 DRA Step pulldown 値域
// SSOT: docs/submit-alt3-tags.md §5.3 (`_dra/metadata.md` 由来)
// i18n key 命名: pulldown.dra.<field>.values.<value> (data-model.md §4.7)

export const DRA_LIBRARY_STRATEGY_VALUES = [
  "WGS",
  "WGA",
  "WXS",
  "WCS",
  "CLONE",
  "POOLCLONE",
  "CLONEEND",
  "FINISHING",
  "AMPLICON",
  "Targeted-Capture",
  "RAD-Seq",
  "Reduced Representation",
  "RNA-Seq",
  "miRNA-Seq",
  "ncRNA-Seq",
  "ssRNA-seq",
  "EST",
  "FL-cDNA",
  "CTS",
  "ChIP-Seq",
  "MNase-Seq",
  "DNase-Hypersensitivity",
  "Bisulfite-Seq",
  "MRE-Seq",
  "MeDIP-Seq",
  "MBD-Seq",
  "FAIRE-seq",
  "NOMe-Seq",
  "Hi-C",
  "ChIA-PET",
  "Tethered Chromatin Conformation Capture",
  "ATAC-seq",
  "RIP-Seq",
  "Tn-Seq",
  "SELEX",
  "Synthetic-Long-Read",
  "Other",
] as const
export type DraLibraryStrategy = (typeof DRA_LIBRARY_STRATEGY_VALUES)[number]

export const DRA_LIBRARY_SOURCE_VALUES = [
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
export type DraLibrarySource = (typeof DRA_LIBRARY_SOURCE_VALUES)[number]

export const DRA_LIBRARY_SELECTION_VALUES = [
  "RANDOM",
  "PCR",
  "RANDOM PCR",
  "RT-PCR",
  "HMPR",
  "MF",
  "repeat fractionation",
  "size fractionation",
  "MSLL",
  "cDNA",
  "cDNA_randomPriming",
  "cDNA_oligo_dT",
  "PolyA",
  "Oligo-dT",
  "Inverse rRNA",
  "ChIP",
  "MNase",
  "DNAse",
  "Hybrid Selection",
  "Reduced Representation",
  "Restriction Digest",
  "5-methylcytidine antibody",
  "MBD2 protein methyl-CpG binding domain",
  "CAGE",
  "RACE",
  "MDA",
  "padlock probes capture method",
  "other",
  "unspecified",
] as const
export type DraLibrarySelection = (typeof DRA_LIBRARY_SELECTION_VALUES)[number]

export const DRA_PLATFORM_VALUES = [
  "ILLUMINA",
  "PACBIO_SMRT",
  "OXFORD_NANOPORE",
  "ION_TORRENT",
  "BGISEQ",
  "CAPILLARY",
  "LS454",
  "ABI_SOLID",
  "COMPLETE_GENOMICS",
  "HELICOS",
] as const
export type DraPlatform = (typeof DRA_PLATFORM_VALUES)[number]

// Platform 別 Instrument (PoC は代表モデルのみ、追加は本番で精緻化)
export const DRA_INSTRUMENT_VALUES: Readonly<
  Record<DraPlatform, readonly string[]>
> = {
  ILLUMINA: [
    "Illumina HiSeq 2500",
    "Illumina HiSeq 4000",
    "Illumina NovaSeq 6000",
    "Illumina NextSeq 500",
    "Illumina NextSeq 2000",
    "Illumina MiSeq",
    "Illumina iSeq 100",
    "NextSeq 1000",
  ],
  PACBIO_SMRT: [
    "PacBio RS II",
    "PacBio Sequel",
    "PacBio Sequel II",
    "Revio",
  ],
  OXFORD_NANOPORE: [
    "MinION",
    "GridION",
    "PromethION",
    "Flongle",
  ],
  ION_TORRENT: [
    "Ion Torrent PGM",
    "Ion Torrent Proton",
    "Ion Torrent S5",
    "Ion Torrent S5 XL",
  ],
  BGISEQ: [
    "BGISEQ-500",
    "DNBSEQ-G400",
    "DNBSEQ-T7",
    "MGISEQ-2000RS",
  ],
  CAPILLARY: ["AB 3730xL", "AB 3500"],
  LS454: ["454 GS FLX", "454 GS FLX+"],
  ABI_SOLID: ["AB SOLiD 4", "AB SOLiD 5500"],
  COMPLETE_GENOMICS: ["Complete Genomics"],
  HELICOS: ["Helicos HeliScope"],
}

export const DRA_LAYOUT_VALUES = ["single", "paired"] as const
export type DraLayout = (typeof DRA_LAYOUT_VALUES)[number]

export const DRA_RUN_FILE_TYPE_VALUES = [
  "fastq",
  "hdf5",
  "bam",
  "tab",
  "reference_fasta",
] as const
export type DraRunFileType = (typeof DRA_RUN_FILE_TYPE_VALUES)[number]

export const DRA_ANALYSIS_TYPE_VALUES = [
  "De Novo Assembly",
  "Sequence Annotation",
  "Abundance Measurement",
] as const
export type DraAnalysisType = (typeof DRA_ANALYSIS_TYPE_VALUES)[number]
