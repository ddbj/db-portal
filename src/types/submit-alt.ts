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

// 新トップ階層 10 項目 + 横断属性 1 個。docs/submit-alt.md L61-80 参照。
export type DataTypeId =
  | "human-restricted"
  | "sequence-read"
  | "genome"
  | "variation"
  | "proteomics"
  | "est"
  | "microarray"
  | "spatial-transcriptomics"
  | "metabolomics"
  | "small-sequence"

export type HorizontalAttributeId = "human"

// 33 leaf。docs/submit-alt.md L203-274 参照。
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

// tree の中間 question node。簡略化方針に従い depth 2-3 に収める。
// docs/submit-alt.md L142-188 の構造を反映。
export type QuestionNodeIdAlt =
  | "genome"
  | "genome-eukaryote"
  | "genome-prokaryote"
  | "genome-virus"
  | "genome-metagenome"
  | "sequence-read"
  | "sequence-read-metagenome"
  | "variation"
  | "spatial-transcriptomics"
  | "est"

export type TreeNodeIdAlt = LeafNodeIdAlt | QuestionNodeIdAlt

// 新ゴール一覧。docs/submit-alt.md L277-298 参照。
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

// leaf がヒト由来データ Y/N 軸とどう関係するか。
export type HumanAffinity = "always-human" | "always-nonhuman" | "either"

export interface QuestionOptionAlt {
  labelKey: string
  childId: TreeNodeIdAlt
}

export interface QuestionNodeAlt {
  id: QuestionNodeIdAlt
  type: "question"
  questionKey: string
  // 起点（root）と中間 node の区別。起点は data type に対応する。
  isRoot: boolean
  options: readonly QuestionOptionAlt[]
  parentId: QuestionNodeIdAlt | null
}

export interface LeafNodeAlt {
  id: LeafNodeIdAlt
  type: "leaf"
  // 仕様書の番号（leaf-NN / v01-v03 / m06 / s01-s02）。表示・テスト用。
  legacyId: string
  goal: RegistrationGoalAlt
  venue: RegistrationVenue
  parentId: QuestionNodeIdAlt | null
  // types= 連動ハイライト計算用。leaf 1 つが複数 data type に該当することがある。
  dataTypes: readonly DataTypeId[]
  humanAffinity: HumanAffinity
}

export type TreeNodeAlt = QuestionNodeAlt | LeafNodeAlt

export type CardIdAlt =
  | "microbial-genome"
  | "eukaryote-genome"
  | "metagenome"
  | "expression"
  | "spatial-tx"
  | "variation"
  | "proteomics"
  | "metabolomics"
  | "small-sequence"
  | "human-restricted"

export interface UseCaseCardAlt {
  id: CardIdAlt
  titleKey: string
  descriptionKey: string
  iconName: string
  // クリック時の遷移先 (?for=...)
  treeNodeId: TreeNodeIdAlt
  // ハイライト判定: types= の集合と交差する場合に active 表示
  relatedDataTypes: readonly DataTypeId[]
  // ハイライト判定: leaf 単位での絞り込みにも使う
  relatedLeafIds: readonly LeafNodeIdAlt[]
  order: number
}

export interface DataTypeDef {
  id: DataTypeId
  labelKey: string
  descriptionKey: string
}

export interface HorizontalAttributeDef {
  id: HorizontalAttributeId
  labelKey: string
  descriptionKey: string
}

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

export interface DetailOverviewBranchAlt {
  dataLabelKey: string
  leafId: LeafNodeIdAlt
  goalLabel: string
}

export interface DetailOverviewAltDef {
  cardId: CardIdAlt
  summaryKey: string
  hasThreeLayer: boolean
  branches: readonly DetailOverviewBranchAlt[]
  commonRequirementsKey: string
  primaryLinks: readonly DetailLinkAlt[]
}
