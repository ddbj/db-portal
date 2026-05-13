import type {
  BPDataType,
  BSPackage,
  DRAInstrument,
  DRALibrarySource,
  DRALibraryStrategy,
  GEASubmissionType,
  JGAObjectType,
  MetaboBankSubmissionType,
  MSSDataType,
} from "@/lib/mock-data/submit-alt-tree/masters"

// Q&A 質問ウィザード軸。docs/submit-alt.md「Section 1: 質問ウィザード」参照。

// Q1: 持っているファイル / データ (8 種、複数選択、必須)
export type Q1Id =
  | "sequence-read"
  | "assembled"
  | "annotation"
  | "variation"
  | "expression-array"
  | "expression-matrix"
  | "mass-spec"
  | "spatial-tx"

// Q2: 対象生物 (6 種、単一選択、必須)
export type Q2Id =
  | "human"
  | "eukaryote"
  | "prokaryote"
  | "virus"
  | "metagenome"
  | "organelle-plasmid"

// Q3: アクセス制限 (Q2=human の時のみ)
export type Q3Id = "open" | "restricted"

// Q4: アセンブリの由来 (Q1 に assembled を含む時のみ)
export type Q4Id = "primary" | "tpa"

// Q5: 規模 (Q1=sequence-read/assembled のみ で Q2=prokaryote/eukaryote/virus/organelle-plasmid の時)
export type Q5Id = "small" | "normal"

// Q6: 特殊形式 (Q1 に assembled 含み Q2∈{human,eukaryote,metagenome} の時、複数選択)
export type Q6Id = "haplotype" | "tsa" | "tls" | "mag-sag" | "est" | "none"

// Q7: 質量分析サブ種別 (Q1 に mass-spec 含む時)
export type Q7Id = "proteomics" | "metabolomics"

// Q8: メタゲノムデータ種別 (Q1=sequence-read のみ で Q2=metagenome の時)
export type Q8Id = "raw" | "primary"

// Q9: ヒト試料のメタゲノム由来判定 (Q2=human + Q3=restricted の時)
export type Q9Id = "yes" | "no"

export interface QAAnswers {
  q1: ReadonlySet<Q1Id>
  q2: Q2Id | null
  q3: Q3Id | null
  q4: Q4Id | null
  q5: Q5Id | null
  q6: ReadonlySet<Q6Id>
  q7: Q7Id | null
  q8: Q8Id | null
  q9: Q9Id | null
}

// 36 leaf。docs/submit-alt.md 参照。
export type LeafNodeIdAlt =
  | "human-restricted"
  | "proteomics"
  | "metabolomics"
  | "variation-nonhuman"
  | "variation-human-open"
  | "variation-human-restricted"
  | "expression-ngs"
  | "expression-array"
  | "small-sequence"
  | "metagenome-raw"
  | "metagenome-primary"
  | "metagenome-genome-bin"
  | "metagenome-tls"
  | "metagenome-tsa"
  | "human-microbiome-restricted"
  | "organelle-plasmid"
  | "prokaryote-raw"
  | "prokaryote-raw-assembly"
  | "prokaryote-assembly-only"
  | "virus-raw"
  | "virus-raw-assembly"
  | "virus-assembly-only"
  | "eukaryote-tsa"
  | "eukaryote-tpa"
  | "eukaryote-raw"
  | "eukaryote-raw-assembly"
  | "eukaryote-assembly-only"
  | "eukaryote-haplotype-raw-assembly"
  | "eukaryote-haplotype-assembly-only"
  | "eukaryote-est-small"
  | "eukaryote-est-large"
  | "spatial-tx-nonhuman"
  | "spatial-tx-restricted"
  | "human-raw-open"
  | "human-raw-assembly-open"
  | "human-assembly-only-open"

// 新ゴール一覧。docs/submit-alt.md 参照。
// 旧 /submit より JGA-analysis / HumanDBs / SRA-analysis / GEA(Xenium) / NSSS(EST) / BP+BS+MSS(TPA/EST) を追加。
export type RegistrationGoalAlt =
  | "JGA"
  | "jPOST"
  | "BP+BS+MetaboBank"
  | "EVA"
  | "dgVa"
  | "JVar SNP"
  | "JVar SV"
  | "SRA-analysis"
  | "JGA-analysis"
  | "HumanDBs"
  | "BP+BS+DRA+GEA"
  | "BP+BS+GEA"
  | "BP+BS+GEA(Xenium)"
  | "NSSS"
  | "NSSS(EST)"
  | "BP+BS+DRA"
  | "BP+BS+DRA(Analysis)"
  | "BP+BS+DRA+MSS"
  | "BP+BS+DRA+MSS(TLS)"
  | "BP+BS+DRA+MSS(TSA)"
  | "BP+BS+DRA+MSS(Haplotype)"
  | "BP+BS+MSS"
  | "BP+BS+MSS(TPA)"
  | "BP+BS+MSS(Haplotype)"
  | "BP+BS+MSS(EST)"

export type RegistrationVenue = "internal" | "external"

// 詳細パネルの goal テンプレート。docs/submit-alt.md の登録順序パターン別に分類。
export type GoalTemplateIdAlt =
  | "jga"
  | "jga-analysis"
  | "external-jpost"
  | "external-eva"
  | "external-dgva"
  | "external-humandbs"
  | "jvar"
  | "sra-analysis"
  | "metabobank"
  | "gea"
  | "gea-xenium"
  | "nsss"
  | "genome"

// マルチ選択時のフロー判定。docs/submit-alt.md L83-94 参照。
export type MultiSelectPattern =
  | "single"
  | "merged-submission"
  | "shared-bp-bs"
  | "fully-independent"
  | "jga-unified"

export interface DetailLinkAlt {
  labelKey: string
  url: string
  external: boolean
}

// leaf 単位の軸補強情報。masters への参照を ID 配列で持つ。
export interface MasterRefs {
  bpDataTypes?: readonly BPDataType[]
  bsPackages?: readonly BSPackage[]
  draLibrarySources?: readonly DRALibrarySource[]
  draLibraryStrategies?: readonly DRALibraryStrategy[]
  draInstruments?: readonly DRAInstrument[]
  geaSubmissionTypes?: readonly GEASubmissionType[]
  metabobankSubmissionTypes?: readonly MetaboBankSubmissionType[]
  jgaObjectTypes?: readonly JGAObjectType[]
  mssDataTypes?: readonly MSSDataType[]
}

export interface LeafDetailAlt {
  leafId: LeafNodeIdAlt
  goal: RegistrationGoalAlt
  goalLabel: string
  goalTemplateId: GoalTemplateIdAlt
  venue: RegistrationVenue
  summaryKey: string
  stepKeys: readonly string[]
  masters: MasterRefs
  extraLinks?: readonly DetailLinkAlt[]
}

export interface GoalTemplateAlt {
  id: GoalTemplateIdAlt
  venue: RegistrationVenue
  commonRequirementsKey: string
  primaryLinks: readonly DetailLinkAlt[]
}

