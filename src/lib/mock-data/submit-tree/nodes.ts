import type {
  LeafNode,
  LeafNodeId,
  QuestionNode,
  QuestionNodeId,
  TreeNode,
} from "@/types/submit"

import { LEAF_GOALS, LEAF_NUMBER, LEAF_PARENTS } from "./leafGoals"

const QUESTION_NODES: readonly QuestionNode[] = [
  {
    id: "root",
    type: "question",
    question: "ヒトを対象とした個人特定リスクのあるデータか？",
    options: [
      { label: "はい（NBDC 承認要）", childId: "human-restricted" },
      { label: "いいえ", childId: "modality" },
    ],
    parentId: null,
  },
  {
    id: "modality",
    type: "question",
    question: "計測モダリティは？",
    options: [
      { label: "プロテオミクス", childId: "proteomics" },
      { label: "メタボロミクス", childId: "metabolomics" },
      { label: "変異コール結果（SNP / SV）", childId: "variation" },
      { label: "遺伝子発現プロファイリング", childId: "expression" },
      { label: "塩基配列（DNA / RNA）", childId: "sequence-scale" },
    ],
    parentId: "root",
  },
  {
    id: "variation",
    type: "question",
    question: "対象生物 × 変異タイプは？",
    options: [
      { label: "ヒト × SNP / Indel（≤ 50 bp）", childId: "variation-human-snp" },
      { label: "ヒト × SV（> 50 bp）", childId: "variation-human-sv" },
      { label: "非ヒト × SNP / Indel", childId: "variation-nonhuman-snp" },
      { label: "非ヒト × SV", childId: "variation-nonhuman-sv" },
    ],
    parentId: "modality",
  },
  {
    id: "expression",
    type: "question",
    question: "計測技術は？",
    options: [
      { label: "NGS による RNA-seq", childId: "expression-ngs" },
      { label: "マイクロアレイ", childId: "expression-array" },
    ],
    parentId: "modality",
  },
  {
    id: "sequence-scale",
    type: "question",
    question: "規模は？",
    options: [
      { label: "小規模（< 100 配列・< 500 kb）", childId: "small-sequence" },
      { label: "大規模", childId: "sequence-source" },
    ],
    parentId: "modality",
  },
  {
    id: "sequence-source",
    type: "question",
    question: "由来は？",
    options: [
      { label: "単一生物", childId: "single-organism" },
      { label: "環境サンプル / メタゲノム", childId: "metagenome" },
    ],
    parentId: "sequence-scale",
  },
  {
    id: "metagenome",
    type: "question",
    question: "メタゲノム種別は？",
    options: [
      { label: "生リードのみ", childId: "metagenome-raw" },
      { label: "未同定コンティグ（Primary）", childId: "metagenome-primary" },
      { label: "ゲノムビン（MAG / Binned / SAG）", childId: "metagenome-genome-bin" },
      { label: "OTU プロファイル（TLS）", childId: "metagenome-tls" },
      { label: "メタトランスクリプトーム（メタ TSA）", childId: "metagenome-tsa" },
    ],
    parentId: "sequence-source",
  },
  {
    id: "single-organism",
    type: "question",
    question: "生物カテゴリは？",
    options: [
      { label: "微生物（原核・ウイルス・オルガネラ）", childId: "microbial" },
      { label: "真核生物（動物・植物・菌類）", childId: "eukaryote" },
    ],
    parentId: "sequence-source",
  },
  {
    id: "microbial",
    type: "question",
    question: "微生物のサブカテゴリは？",
    options: [
      { label: "原核生物（細菌・古細菌）", childId: "prokaryote" },
      { label: "ウイルス / ファージ", childId: "virus" },
      { label: "オルガネラ / プラスミド", childId: "organelle-plasmid" },
    ],
    parentId: "single-organism",
  },
  {
    id: "prokaryote",
    type: "question",
    question: "原核ゲノムのデータ形式は？",
    options: [
      { label: "生リードのみ", childId: "prokaryote-raw" },
      { label: "生リード + アセンブリ", childId: "prokaryote-raw-assembly" },
      { label: "アセンブリのみ", childId: "prokaryote-assembly-only" },
    ],
    parentId: "microbial",
  },
  {
    id: "virus",
    type: "question",
    question: "ウイルスゲノムのデータ形式は？",
    options: [
      { label: "生リードのみ", childId: "virus-raw" },
      { label: "生リード + アセンブリ", childId: "virus-raw-assembly" },
      { label: "アセンブリのみ", childId: "virus-assembly-only" },
    ],
    parentId: "microbial",
  },
  {
    id: "eukaryote",
    type: "question",
    question: "真核ゲノムのデータ特殊性は？",
    options: [
      { label: "通常の真核ゲノム", childId: "eukaryote-genome" },
      { label: "Haplotype 区別あり（二倍体）", childId: "eukaryote-haplotype" },
      { label: "de novo 転写産物アセンブリ（TSA）", childId: "eukaryote-tsa" },
      { label: "単発 cDNA（EST）", childId: "eukaryote-est" },
      { label: "第三者アノテーション（TPA）", childId: "eukaryote-tpa" },
    ],
    parentId: "single-organism",
  },
  {
    id: "eukaryote-genome",
    type: "question",
    question: "真核ゲノムのデータ形式は？",
    options: [
      { label: "生リードのみ", childId: "eukaryote-raw" },
      { label: "生リード + アセンブリ", childId: "eukaryote-raw-assembly" },
      { label: "アセンブリのみ", childId: "eukaryote-assembly-only" },
    ],
    parentId: "eukaryote",
  },
  {
    id: "eukaryote-haplotype",
    type: "question",
    question: "Haplotype のデータ形式は？",
    options: [
      { label: "生リード + アセンブリ", childId: "eukaryote-haplotype-raw-assembly" },
      { label: "アセンブリのみ", childId: "eukaryote-haplotype-assembly-only" },
    ],
    parentId: "eukaryote",
  },
  {
    id: "eukaryote-est",
    type: "question",
    question: "EST の規模は？",
    options: [
      { label: "小規模（< 100 配列）", childId: "eukaryote-est-small" },
      { label: "大規模", childId: "eukaryote-est-large" },
    ],
    parentId: "eukaryote",
  },
]

const LEAF_NODES: readonly LeafNode[] = (Object.keys(LEAF_GOALS) as LeafNodeId[]).map(
  (leafId) => ({
    id: leafId,
    type: "leaf",
    leafNumber: LEAF_NUMBER[leafId],
    goal: LEAF_GOALS[leafId],
    parentId: LEAF_PARENTS[leafId] as QuestionNodeId,
  }),
)

export const TREE_NODES: readonly TreeNode[] = [...QUESTION_NODES, ...LEAF_NODES]
