// submit-alt3 MSS / NSSS Step pulldown 値域 + DIVISION / DATATYPE / TPA / KEYWORDS
// SSOT: docs/submit-alt3-tags.md §5.3 / §5.6 (`_ddbj/flat-file.md`, `_ddbj/data-categories.md`, `_ddbj/tpa.md`)

import type { AssemblyForm, Organism } from "@/types/submit-alt3"

// MSS data type (`_ddbj/data-categories.md` 11 種、PoC スコープ)
export const MSS_DATATYPE_VALUES = [
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
] as const
export type MssDataType = (typeof MSS_DATATYPE_VALUES)[number]

// MSS DIVISION (`_ddbj/flat-file.md` 21 種から PoC 対象 17 種、`PAT`/`STS`/`UNA`/`CON` は対象外)
export const MSS_DIVISION_VALUES = [
  "HUM",
  "PRI",
  "ROD",
  "MAM",
  "VRT",
  "INV",
  "PLN",
  "BCT",
  "VRL",
  "PHG",
  "ENV",
  "SYN",
  "EST",
  "TSA",
  "GSS",
  "HTC",
  "HTG",
] as const
export type MssDivision = (typeof MSS_DIVISION_VALUES)[number]

// MSS entry route (`_ddbj/web-submission.md`、`mss` (FTP/直接) vs `nsss` (Web))
export const MSS_ENTRY_ROUTES = ["mss", "nsss"] as const
export type MssEntryRoute = (typeof MSS_ENTRY_ROUTES)[number]

// Rule 13 organism → DIVISION 簡略マッピング (tags.md §5.6.1)
// `human-microbiome` は ENV 既定だが、restricted の場合 Rule 6 で MSS Step 自体が抑制されるので
// open 時のみ有効。
export const ORGANISM_TO_DEFAULT_DIVISION: Readonly<Record<Organism, MssDivision>> = {
  "human": "HUM",
  "eukaryote": "MAM", // PoC default、補助 pulldown で PRI/ROD/VRT/INV/PLN に切替
  "prokaryote": "BCT",
  "virus": "VRL", // bacteriophage は PHG に切替
  "metagenome": "ENV",
  "human-microbiome": "ENV",
  "organelle-plasmid": "MAM", // PoC fallback (本来は親生物に依存、本番で精緻化)
}

// Rule 13 assembly-form → DATATYPE 自動推測 (tags.md §5.6.1)
// 生物由来 DATATYPE (WGS/GNM/MAG/SAG/HTG/HTC/TSA/HTC/EST 等) は assembly-form と 1:1 対応
// TLS / SYN / GSS / MISC / ASK は DATATYPE 値 (DIVISION は生物由来から推測)
export const ASSEMBLY_FORM_TO_DATATYPE: Readonly<
  Record<AssemblyForm, MssDataType>
> = {
  "wgs": "WGS",
  "gnm": "GNM",
  "tsa": "TSA",
  "tls": "TLS",
  "est": "EST",
  "mag": "MAG",
  "sag": "SAG",
  "htg": "HTG",
  "htc": "HTC",
  "gss": "WGS", // GSS は DIVISION=GSS、DATATYPE は WGS default (DDBJ Curator 判断)
  "syn": "MISC", // SYN は DIVISION=SYN、DATATYPE は MISC default
  "misc": "MISC",
  "ask": "ASK",
}

// assembly-form → DIVISION 上書き (assembly-form 由来で DIVISION が決まるケース、Rule 13)
// organism よりも assembly-form が優先する case のみ
export const ASSEMBLY_FORM_TO_DIVISION_OVERRIDE: Readonly<
  Partial<Record<AssemblyForm, MssDivision>>
> = {
  "tsa": "TSA",
  "est": "EST",
  "gss": "GSS",
  "syn": "SYN",
  "htg": "HTG",
  "htc": "HTC",
  "mag": "ENV",
  "sag": "ENV",
}

// TPA サブタイプ (現受付中 2 種、tags.md §5.3、tpa.md SSOT)
export const MSS_TPA_SUBTYPES = ["tpa-assembly", "tpa-specialist-db"] as const
export type MssTpaSubtype = (typeof MSS_TPA_SUBTYPES)[number]

// TPA サブタイプ → DEFINITION 行 prefix + KEYWORDS 自動付与 (Rule 7a)
export const MSS_TPA_DEFINITION_PREFIX: Readonly<Record<MssTpaSubtype, string>> = {
  "tpa-assembly": "TPA_asm:",
  "tpa-specialist-db": "TPA:",
}

export const MSS_TPA_KEYWORDS_AUTO_APPEND: Readonly<Record<MssTpaSubtype, string>> = {
  "tpa-assembly": "Third Party Data; TPA; TPA:assembly.",
  "tpa-specialist-db": "Third Party Data; TPA; TPA:specialist_db.",
}

// TPA:assembly の有効 data type (4 種、tpa.md SSOT)
export const MSS_TPA_ASSEMBLY_VALID_DATATYPES: readonly MssDataType[] = [
  "WGS",
  "MAG",
  "TSA",
  "TLS",
]

// HTG phase (Rule 13 自動付与対象)
export const MSS_HTG_PHASES = ["HTG_PHASE0", "HTG_PHASE1", "HTG_PHASE2"] as const
export type MssHtgPhase = (typeof MSS_HTG_PHASES)[number]

// INSDC methodological keywords (PoC スコープ、https://insdc.org/submitting-standards/methodological-keywords/)
// MSS Step の KEYWORDS 行に multi-select で追加できる controlled vocabulary。
// 値はそのまま flatfile の KEYWORDS 行に "; " 連結で出力される。
export const MSS_KEYWORDS_VOCABULARY = [
  "BARCODE",
  "Environmental Sample",
  "GSC:MIxS",
  "MAG",
  "MIENS",
  "MIENS-C",
  "MIENS-S",
  "MIGS",
  "MIGS:3.0",
  "MIGS:4.0",
  "MIGS:5.0",
  "MIGS:6.0",
  "MIGS-EU",
  "MIGS-VI",
  "MIGS-BA",
  "MIMAG",
  "MIMS",
  "MIMARKS",
  "MIMARKS-Specimen",
  "MIMARKS-Survey",
  "MISAG",
  "MIUVIG",
  "Targeted Locus Study",
  "TLS",
  "Third Party Data",
  "TPA",
  "TPA:assembly",
  "TPA:experimental",
  "TPA:inferential",
  "TPA:specialist_db",
  "TSA",
  "Transcriptome Shotgun Assembly",
  "WGS",
] as const
export type MssKeyword = (typeof MSS_KEYWORDS_VOCABULARY)[number]

// BP Project Data Type (tags.md §5.3、`_bioproject/project-info.md` 13 種)
export const BP_PROJECT_DATA_TYPES = [
  "Genome Sequencing",
  "Clone Ends",
  "Epigenomics",
  "Exome",
  "Map",
  "Metagenome",
  "Phenotype and Genotype",
  "Proteome",
  "Random Survey",
  "Targeted Locus",
  "Transcriptome or Gene Expression",
  "Variation",
  "Other",
] as const
export type BpProjectDataType = (typeof BP_PROJECT_DATA_TYPES)[number]

// GEA Submission Type (tags.md §5.3、2 種)
export const GEA_SUBMISSION_TYPES = ["Sequencing", "Microarray"] as const
export type GeaSubmissionType = (typeof GEA_SUBMISSION_TYPES)[number]

// MetaboBank Submission Type (tags.md §5.3、11 種)
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

// TogoVar Study Type (Rule 4 内部分岐用、`_togovar/submission.md`)
export const TOGOVAR_STUDY_TYPES = ["snp", "sv"] as const
export type TogoVarStudyType = (typeof TOGOVAR_STUDY_TYPES)[number]
