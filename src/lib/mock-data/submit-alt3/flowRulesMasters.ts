// submit-alt3 flow generation rule のルックアップテーブル
// SSOT: docs/submit-alt3-flow-rules.md §8.1 (Rule 1 優先順序 / Rule 5 系統距離 / Rule 6 JGA / Rule 11 / Rule 12 / Rule 14a)

import {
  type AssemblyForm,
  EXTERNAL_SERVICES,
  type FunctionalGenomics,
  type Organism,
  type ServiceKind,
  type SpatialPlatform,
} from "@/types/submit-alt3"

import type {
  DraLibrarySource,
  DraLibraryStrategy,
} from "./draMasters"
import type {
  BpProjectDataType,
  GeaSubmissionType,
  MssDataType,
} from "./mssMasters"

// ----- Rule 5 系統距離マップ (organism 集合 → 分割するか) -----
// SSOT: flow-rules.md §8.1 Rule 5 表
// 集合内の任意 2 organism について「分割が必要」(distance=large) か「共通系統で 1 BP」(distance=small) かを返す。
//
// PoC は organism 7 値の組合せを enumerate。本番では NCBI Taxonomy 連動で精緻化。

export const PHYLOGENY_DISTANCE_TABLE: Readonly<
  Record<Organism, Readonly<Partial<Record<Organism, "small" | "large">>>>
> = {
  "human": {
    "human": "small",
    "human-microbiome": "large",
    "eukaryote": "small", // 真核同士で近い (Mammalia 系統)
    "prokaryote": "large",
    "virus": "large",
    "metagenome": "large",
    "organelle-plasmid": "large",
  },
  "human-microbiome": {
    "human": "large",
    "human-microbiome": "small",
    "eukaryote": "large",
    "prokaryote": "large",
    "virus": "large",
    "metagenome": "large",
    "organelle-plasmid": "large",
  },
  "eukaryote": {
    "human": "small",
    "human-microbiome": "large",
    "eukaryote": "small",
    "prokaryote": "large",
    "virus": "large",
    "metagenome": "large",
    "organelle-plasmid": "large",
  },
  "prokaryote": {
    "human": "large",
    "human-microbiome": "large",
    "eukaryote": "large",
    "prokaryote": "small",
    "virus": "large",
    "metagenome": "large",
    "organelle-plasmid": "large",
  },
  "virus": {
    "human": "large",
    "human-microbiome": "large",
    "eukaryote": "large",
    "prokaryote": "large",
    "virus": "small",
    "metagenome": "large",
    "organelle-plasmid": "large",
  },
  "metagenome": {
    "human": "large",
    "human-microbiome": "large",
    "eukaryote": "large",
    "prokaryote": "large",
    "virus": "large",
    "metagenome": "small",
    "organelle-plasmid": "large",
  },
  "organelle-plasmid": {
    "human": "large",
    "human-microbiome": "large",
    "eukaryote": "large",
    "prokaryote": "large",
    "virus": "large",
    "metagenome": "large",
    "organelle-plasmid": "small",
  },
}

// 共通系統名 (Rule 5、UI 表示用 commonLineage、PoC 簡略マッピング)
export const ORGANISM_TO_LINEAGE: Readonly<Record<Organism, string>> = {
  "human": "Mammalia",
  "eukaryote": "Eukaryote",
  "prokaryote": "Bacteria",
  "virus": "Virus",
  "metagenome": "Metagenome",
  "human-microbiome": "Human-Microbiome",
  "organelle-plasmid": "Organelle/Plasmid",
}

// Rule 6 発火条件: organism ∈ {human, human-microbiome} + access=restricted
export const JGA_TARGET_ORGANISMS: readonly Organism[] = [
  "human",
  "human-microbiome",
]

// Rule 11a: organism → Haplotype phased 共通 BS の MIGS variant Package (内部キー、masters.ts §5.3 SSOT)
export const HAPLOTYPE_ORGANISM_TO_MIGS_PACKAGE: Readonly<
  Partial<Record<Organism, string>>
> = {
  "eukaryote": "migs-eu",
  "prokaryote": "migs-ba",
  "virus": "migs-vi",
}

// Rule 11c: haplotype-naming → Title/バッジ文字列のマップ
export const HAPLOTYPE_NAMING_LABELS: Readonly<
  Record<string, { primary: string; secondary: string }>
> = {
  "principal-alternate": { primary: "Principal", secondary: "Alternate" },
  "haplotype-1-2": { primary: "Haplotype 1", secondary: "Haplotype 2" },
  "maternal-paternal": { primary: "Maternal", secondary: "Paternal" },
}

// 全 ServiceKind の登録 / 案内ページ URL + 「{Service名} 登録サービスを開く」ボタンの i18n labelKey
// SSOT: docs/submit-alt3.md §6.1 (Step カードに遷移ボタン必須)
// URL の根拠: docs/submit-details.md (D-way / MSS フォーム / BioProject 等の登録手順ページ)。
// JGA 8 種は D-way ではなく JGA 案内ページ (`_jga/submission.md` 該当ページ) を割り当てる
// (docs/submit-alt3-flow-rules.md Rule 6 共通: JGA は NBDC 申請 + sftp + 独自 XSD で完結)。
// 各 ServiceKind の labelKey は ja.json / en.json の routes.submitAlt3.flowSteps.<service>.serviceLink を参照。
export const SERVICE_URLS: Readonly<
  Partial<Record<ServiceKind, { url: string; labelKey: string }>>
> = {
  "umbrella-bioproject": {
    url: "https://ddbj.nig.ac.jp/D-way",
    labelKey: "routes.submitAlt3.flowSteps.umbrella-bioproject.serviceLink",
  },
  "primary-bioproject": {
    url: "https://ddbj.nig.ac.jp/D-way",
    labelKey: "routes.submitAlt3.flowSteps.primary-bioproject.serviceLink",
  },
  "biosample": {
    url: "https://ddbj.nig.ac.jp/D-way",
    labelKey: "routes.submitAlt3.flowSteps.biosample.serviceLink",
  },
  "dra": {
    url: "https://ddbj.nig.ac.jp/D-way",
    labelKey: "routes.submitAlt3.flowSteps.dra.serviceLink",
  },
  // JGA は 8 オブジェクト (Submission / Study / Sample / Experiment / Data / Analysis / Dataset / Policy) を
  // 単一 Step に集約。JGA 申請管理システム 1 箇所で完結するため、Step / serviceUrl も 1 つに統一。
  "jga": {
    url: "https://www.ddbj.nig.ac.jp/jga/submission.html",
    labelKey: "routes.submitAlt3.flowSteps.jga.serviceLink",
  },
  "gea": {
    url: "https://ddbj.nig.ac.jp/D-way",
    labelKey: "routes.submitAlt3.flowSteps.gea.serviceLink",
  },
  "mss": {
    url: "https://mss.ddbj.nig.ac.jp/",
    labelKey: "routes.submitAlt3.flowSteps.mss.serviceLink",
  },
  "metabobank": {
    url: "https://mb2.ddbj.nig.ac.jp/",
    labelKey: "routes.submitAlt3.flowSteps.metabobank.serviceLink",
  },
  "togovar": {
    url: "https://togovar.org/",
    labelKey: "routes.submitAlt3.flowSteps.togovar.serviceLink",
  },
  "dbcls-application": {
    url: "https://humandbs.ddbj.nig.ac.jp/nbdc/application/",
    labelKey: "routes.submitAlt3.flowSteps.dbcls-application.serviceLink",
  },
  "humandbs": {
    url: "https://humandbs.dbcls.jp/",
    labelKey: "routes.submitAlt3.flowSteps.humandbs.serviceLink",
  },
  "jpost": {
    url: "https://repository.jpostdb.org/",
    labelKey: "routes.submitAlt3.flowSteps.jpost.serviceLink",
  },
  "eva": {
    url: "https://www.ebi.ac.uk/eva/",
    labelKey: "routes.submitAlt3.flowSteps.eva.serviceLink",
  },
  "dgva": {
    url: "https://www.ebi.ac.uk/dgva/",
    labelKey: "routes.submitAlt3.flowSteps.dgva.serviceLink",
  },
}

// rule12 が参照する外部 Service 用の派生定数 (SERVICE_URLS から filter)。
// 旧 API 互換性のため独立した名前を残すが、内容は SERVICE_URLS の subset。
export const EXTERNAL_SERVICE_URLS: Readonly<
  Partial<Record<ServiceKind, { url: string; labelKey: string }>>
> = Object.fromEntries(
  EXTERNAL_SERVICES.map((s) => [s, SERVICE_URLS[s]] as const).filter(
    (entry): entry is readonly [ServiceKind, { url: string; labelKey: string }] =>
      entry[1] !== undefined,
  ),
)

// DDBJ お問い合わせ / Curator Contact / DBCLS / MetaboBank Contact 等の汎用 URL
export const DDBJ_CONTACT_URL = "https://www.ddbj.nig.ac.jp/contact-ddbj-e.html"
export const METABOBANK_CONTACT_URL = "https://forms.gle/zV4cYCnRCefd4FSz9"
export const INSDC_KEYWORDS_URL = "https://insdc.org/submitting-standards/methodological-keywords/"

// Rule 4d: 空間 Tx プラットフォーム → GEA Submission Type 振り分け (PoC default)
// GeoMx は readout (ngs / ncounter) で更に切替 (rule04 で個別判定)
export const SPATIAL_PLATFORM_TO_GEA_SUBMISSION_TYPE: Readonly<
  Partial<Record<SpatialPlatform, GeaSubmissionType>>
> = {
  "visium": "Sequencing",
  "xenium": "Microarray",
  "merfish": "Microarray",
  "stereo-seq": "Sequencing",
  "slide-seq": "Sequencing",
  // geomx は rule04 で readout 別判定
}

// Rule 4d: Array Design 未収録扱いのプラットフォーム
export const SPATIAL_TX_UNSUPPORTED_PLATFORMS: readonly SpatialPlatform[] = [
  "stereo-seq",
  "slide-seq",
  "geomx",
]

// Rule 1 の Project data type 推測。発火順 (上から順に最初にマッチした条件を採用)。
// 「条件」が Submission の特性、「dataType」が確定値。flowGen.ts の inferProjectDataType を SSOT 化した版。
export interface ProjectDataTypeCondition {
  key: string
  dataType: BpProjectDataType
}

export const PROJECT_DATA_TYPE_PRIORITY: readonly ProjectDataTypeCondition[] = [
  { key: "variation", dataType: "Variation" },
  { key: "mass-spec-proteomics", dataType: "Proteome" },
  { key: "mass-spec-metabolomics-or-imaging", dataType: "Other" },
  { key: "phenotype-only", dataType: "Phenotype and Genotype" },
  { key: "expression", dataType: "Transcriptome or Gene Expression" },
  { key: "metagenome", dataType: "Metagenome" },
  { key: "tsa-htc-est", dataType: "Transcriptome or Gene Expression" },
  { key: "tls", dataType: "Targeted Locus" },
  { key: "gss", dataType: "Random Survey" },
  { key: "wgs-gnm-htg", dataType: "Genome Sequencing" },
  { key: "wes-target", dataType: "Exome" },
  { key: "raw-genome", dataType: "Genome Sequencing" },
  { key: "fallback", dataType: "Other" },
]

// ----- Rule 14a 整合チェック表 -----
// SSOT: flow-rules.md §8.1 Rule 14a 表
// Library Strategy / Source / DDBJ DATATYPE 入力 → expected chip 値の制約。
// mismatch 検出は rule14_consistencyCheck.ts で行う (この表は「期待 chip 値域」を保持)。

export type ConsistencyCaseSeverity = "warning" | "info"

export interface LibraryStrategyExpectedChip {
  strategies: readonly DraLibraryStrategy[]
  expectedFunctionalGenomics: readonly FunctionalGenomics[]
  severity: ConsistencyCaseSeverity
  warningCaseKey: string // i18n key suffix
  suggestedChipValue?: FunctionalGenomics // 「chip を修正」で提案する値
}

export const LIBRARY_STRATEGY_CONSISTENCY: readonly LibraryStrategyExpectedChip[] = [
  {
    strategies: ["WGS", "WGA", "WCS", "WXS", "Synthetic-Long-Read"],
    expectedFunctionalGenomics: ["wgs-target", "wes-target"],
    severity: "warning",
    warningCaseKey: "wgs_vs_genomicsYes",
    suggestedChipValue: "wgs-target",
  },
  {
    strategies: ["RNA-Seq", "ssRNA-seq", "ncRNA-Seq", "FL-cDNA", "EST", "CTS"],
    expectedFunctionalGenomics: ["yes", "tsa-target"],
    severity: "warning",
    warningCaseKey: "rnaseq_vs_chip",
    suggestedChipValue: "yes",
  },
  {
    strategies: [
      "ChIP-Seq",
      "ATAC-seq",
      "Bisulfite-Seq",
      "Hi-C",
      "MeDIP-Seq",
      "MNase-Seq",
      "MBD-Seq",
      "MRE-Seq",
      "FAIRE-seq",
      "RIP-Seq",
      "ChIA-PET",
      "DNase-Hypersensitivity",
      "Tethered Chromatin Conformation Capture",
      "NOMe-Seq",
    ],
    expectedFunctionalGenomics: ["yes"],
    severity: "warning",
    warningCaseKey: "epigenetics_vs_chip",
    suggestedChipValue: "yes",
  },
  {
    strategies: ["Targeted-Capture"],
    expectedFunctionalGenomics: ["wes-target", "wgs-target"],
    severity: "info",
    warningCaseKey: "targeted_capture_info",
  },
]

// Library Strategy=AMPLICON + Library Source=METAGENOMIC のような複合条件は別関数で実装
export const AMPLICON_METAGENOMIC_EXPECTED_CHIP: FunctionalGenomics = "metagenome-target"

// Library Source 別の期待 chip
export const LIBRARY_SOURCE_INFO: readonly {
  sources: readonly DraLibrarySource[]
  expectedFunctionalGenomics: readonly FunctionalGenomics[]
  severity: ConsistencyCaseSeverity
  warningCaseKey: string
}[] = [
  {
    sources: ["METATRANSCRIPTOMIC"],
    expectedFunctionalGenomics: ["yes", "tsa-target", "metagenome-target"],
    severity: "info",
    warningCaseKey: "metatranscriptomic_info",
  },
  {
    sources: ["SYNTHETIC"],
    expectedFunctionalGenomics: ["other"],
    severity: "info",
    warningCaseKey: "synthetic_info",
  },
]

// MSS DATATYPE → expected chip assembly-form
export interface MssDataTypeExpectedChip {
  dataTypes: readonly MssDataType[]
  expectedAssemblyForm: readonly AssemblyForm[]
  expectedFunctionalGenomics: readonly FunctionalGenomics[]
  severity: ConsistencyCaseSeverity
  warningCaseKey: string
}

export const MSS_DATATYPE_CONSISTENCY: readonly MssDataTypeExpectedChip[] = [
  {
    dataTypes: ["WGS", "GNM"],
    expectedAssemblyForm: ["wgs", "gnm"],
    expectedFunctionalGenomics: ["wgs-target"],
    severity: "warning",
    warningCaseKey: "mss_wgs_assemblyForm",
  },
  {
    dataTypes: ["TSA", "HTC"],
    expectedAssemblyForm: ["tsa", "htc"],
    expectedFunctionalGenomics: ["tsa-target"],
    severity: "warning",
    warningCaseKey: "mss_tsa_assemblyForm",
  },
  {
    dataTypes: ["MAG", "SAG"],
    expectedAssemblyForm: ["mag", "sag"],
    expectedFunctionalGenomics: ["metagenome-target"],
    severity: "warning",
    warningCaseKey: "mss_magsag_assemblyForm",
  },
  {
    dataTypes: ["MISC", "ASK"],
    expectedAssemblyForm: ["misc", "ask"],
    expectedFunctionalGenomics: ["other"],
    severity: "info",
    warningCaseKey: "mss_misc_ask",
  },
]
