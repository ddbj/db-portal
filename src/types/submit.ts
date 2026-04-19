export type LeafNodeId =
  | "human-restricted"
  | "proteomics"
  | "metabolomics"
  | "variation-human-snp"
  | "variation-human-sv"
  | "variation-nonhuman-snp"
  | "variation-nonhuman-sv"
  | "expression-ngs"
  | "expression-array"
  | "small-sequence"
  | "metagenome-raw"
  | "metagenome-primary"
  | "metagenome-genome-bin"
  | "metagenome-tls"
  | "metagenome-tsa"
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

export type QuestionNodeId =
  | "root"
  | "modality"
  | "variation"
  | "expression"
  | "sequence-scale"
  | "sequence-source"
  | "metagenome"
  | "single-organism"
  | "microbial"
  | "prokaryote"
  | "virus"
  | "eukaryote"
  | "eukaryote-genome"
  | "eukaryote-haplotype"
  | "eukaryote-est"

export type TreeNodeId = LeafNodeId | QuestionNodeId

export type RegistrationGoal =
  | "JGA"
  | "jPOST"
  | "BP+BS+MetaboBank"
  | "JVar SNP"
  | "JVar SV"
  | "EVA"
  | "dgVa"
  | "BP+BS+DRA+GEA"
  | "BP+BS+GEA"
  | "NSSS"
  | "BP+BS+DRA"
  | "BP+BS+DRA (Analysis)"
  | "BP+BS+DRA+MSS"
  | "BP+BS+MSS"
  | "BP+BS+DRA+MSS (Haplotype)"
  | "BP+BS+MSS (Haplotype)"

export type GoalTemplateId =
  | "genome"
  | "gea"
  | "nsss"
  | "metabobank"
  | "jga"
  | "external"

export interface QuestionOption {
  label: string
  childId: TreeNodeId
}

export interface QuestionNode {
  id: QuestionNodeId
  type: "question"
  question: string
  options: QuestionOption[]
  parentId: QuestionNodeId | null
}

export interface LeafNode {
  id: LeafNodeId
  type: "leaf"
  leafNumber: number
  goal: RegistrationGoal
  parentId: QuestionNodeId
}

export type TreeNode = QuestionNode | LeafNode

export type CardId =
  | "microbial"
  | "eukaryote"
  | "metagenome"
  | "expression"
  | "variation"
  | "proteomics"
  | "metabolomics"
  | "small-sequence"
  | "human-restricted"

export interface UseCaseCard {
  id: CardId
  title: string
  description: string
  iconName: string
  treeNodeId: TreeNodeId
  order: number
  leafCount: number
}

export interface DetailLink {
  label: string
  url: string
  external: boolean
}

export interface DetailOverviewBranch {
  dataLabel: string
  leafId: LeafNodeId
  goalLabel: string
}

export interface DetailOverview {
  cardId: CardId
  summary: string
  hasThreeLayer: boolean
  branches: DetailOverviewBranch[]
  commonRequirements: string
  primaryLinks: DetailLink[]
}

export interface DetailLeaf {
  leafId: LeafNodeId
  goal: RegistrationGoal
  goalTemplate: GoalTemplateId
  registrationOrder: string
  preparation: string
  leafSpecific: string
  toolLinks: DetailLink[]
}
