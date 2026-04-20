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
    questionKey: "routes.submit.tree.questions.root",
    options: [
      { labelKey: "routes.submit.tree.options.root.human-restricted", childId: "human-restricted" },
      { labelKey: "routes.submit.tree.options.root.modality", childId: "modality" },
    ],
    parentId: null,
  },
  {
    id: "modality",
    type: "question",
    questionKey: "routes.submit.tree.questions.modality",
    options: [
      { labelKey: "routes.submit.tree.options.modality.proteomics", childId: "proteomics" },
      { labelKey: "routes.submit.tree.options.modality.metabolomics", childId: "metabolomics" },
      { labelKey: "routes.submit.tree.options.modality.variation", childId: "variation" },
      { labelKey: "routes.submit.tree.options.modality.expression", childId: "expression" },
      { labelKey: "routes.submit.tree.options.modality.sequence-scale", childId: "sequence-scale" },
    ],
    parentId: "root",
  },
  {
    id: "variation",
    type: "question",
    questionKey: "routes.submit.tree.questions.variation",
    options: [
      { labelKey: "routes.submit.tree.options.variation.variation-human-snp", childId: "variation-human-snp" },
      { labelKey: "routes.submit.tree.options.variation.variation-human-sv", childId: "variation-human-sv" },
      { labelKey: "routes.submit.tree.options.variation.variation-nonhuman-snp", childId: "variation-nonhuman-snp" },
      { labelKey: "routes.submit.tree.options.variation.variation-nonhuman-sv", childId: "variation-nonhuman-sv" },
    ],
    parentId: "modality",
  },
  {
    id: "expression",
    type: "question",
    questionKey: "routes.submit.tree.questions.expression",
    options: [
      { labelKey: "routes.submit.tree.options.expression.expression-ngs", childId: "expression-ngs" },
      { labelKey: "routes.submit.tree.options.expression.expression-array", childId: "expression-array" },
    ],
    parentId: "modality",
  },
  {
    id: "sequence-scale",
    type: "question",
    questionKey: "routes.submit.tree.questions.sequence-scale",
    options: [
      { labelKey: "routes.submit.tree.options.sequence-scale.small-sequence", childId: "small-sequence" },
      { labelKey: "routes.submit.tree.options.sequence-scale.sequence-source", childId: "sequence-source" },
    ],
    parentId: "modality",
  },
  {
    id: "sequence-source",
    type: "question",
    questionKey: "routes.submit.tree.questions.sequence-source",
    options: [
      { labelKey: "routes.submit.tree.options.sequence-source.single-organism", childId: "single-organism" },
      { labelKey: "routes.submit.tree.options.sequence-source.metagenome", childId: "metagenome" },
    ],
    parentId: "sequence-scale",
  },
  {
    id: "metagenome",
    type: "question",
    questionKey: "routes.submit.tree.questions.metagenome",
    options: [
      { labelKey: "routes.submit.tree.options.metagenome.metagenome-raw", childId: "metagenome-raw" },
      { labelKey: "routes.submit.tree.options.metagenome.metagenome-primary", childId: "metagenome-primary" },
      { labelKey: "routes.submit.tree.options.metagenome.metagenome-genome-bin", childId: "metagenome-genome-bin" },
      { labelKey: "routes.submit.tree.options.metagenome.metagenome-tls", childId: "metagenome-tls" },
      { labelKey: "routes.submit.tree.options.metagenome.metagenome-tsa", childId: "metagenome-tsa" },
    ],
    parentId: "sequence-source",
  },
  {
    id: "single-organism",
    type: "question",
    questionKey: "routes.submit.tree.questions.single-organism",
    options: [
      { labelKey: "routes.submit.tree.options.single-organism.microbial", childId: "microbial" },
      { labelKey: "routes.submit.tree.options.single-organism.eukaryote", childId: "eukaryote" },
    ],
    parentId: "sequence-source",
  },
  {
    id: "microbial",
    type: "question",
    questionKey: "routes.submit.tree.questions.microbial",
    options: [
      { labelKey: "routes.submit.tree.options.microbial.prokaryote", childId: "prokaryote" },
      { labelKey: "routes.submit.tree.options.microbial.virus", childId: "virus" },
      { labelKey: "routes.submit.tree.options.microbial.organelle-plasmid", childId: "organelle-plasmid" },
    ],
    parentId: "single-organism",
  },
  {
    id: "prokaryote",
    type: "question",
    questionKey: "routes.submit.tree.questions.prokaryote",
    options: [
      { labelKey: "routes.submit.tree.options.prokaryote.prokaryote-raw", childId: "prokaryote-raw" },
      { labelKey: "routes.submit.tree.options.prokaryote.prokaryote-raw-assembly", childId: "prokaryote-raw-assembly" },
      { labelKey: "routes.submit.tree.options.prokaryote.prokaryote-assembly-only", childId: "prokaryote-assembly-only" },
    ],
    parentId: "microbial",
  },
  {
    id: "virus",
    type: "question",
    questionKey: "routes.submit.tree.questions.virus",
    options: [
      { labelKey: "routes.submit.tree.options.virus.virus-raw", childId: "virus-raw" },
      { labelKey: "routes.submit.tree.options.virus.virus-raw-assembly", childId: "virus-raw-assembly" },
      { labelKey: "routes.submit.tree.options.virus.virus-assembly-only", childId: "virus-assembly-only" },
    ],
    parentId: "microbial",
  },
  {
    id: "eukaryote",
    type: "question",
    questionKey: "routes.submit.tree.questions.eukaryote",
    options: [
      { labelKey: "routes.submit.tree.options.eukaryote.eukaryote-genome", childId: "eukaryote-genome" },
      { labelKey: "routes.submit.tree.options.eukaryote.eukaryote-haplotype", childId: "eukaryote-haplotype" },
      { labelKey: "routes.submit.tree.options.eukaryote.eukaryote-tsa", childId: "eukaryote-tsa" },
      { labelKey: "routes.submit.tree.options.eukaryote.eukaryote-est", childId: "eukaryote-est" },
      { labelKey: "routes.submit.tree.options.eukaryote.eukaryote-tpa", childId: "eukaryote-tpa" },
    ],
    parentId: "single-organism",
  },
  {
    id: "eukaryote-genome",
    type: "question",
    questionKey: "routes.submit.tree.questions.eukaryote-genome",
    options: [
      { labelKey: "routes.submit.tree.options.eukaryote-genome.eukaryote-raw", childId: "eukaryote-raw" },
      { labelKey: "routes.submit.tree.options.eukaryote-genome.eukaryote-raw-assembly", childId: "eukaryote-raw-assembly" },
      { labelKey: "routes.submit.tree.options.eukaryote-genome.eukaryote-assembly-only", childId: "eukaryote-assembly-only" },
    ],
    parentId: "eukaryote",
  },
  {
    id: "eukaryote-haplotype",
    type: "question",
    questionKey: "routes.submit.tree.questions.eukaryote-haplotype",
    options: [
      { labelKey: "routes.submit.tree.options.eukaryote-haplotype.eukaryote-haplotype-raw-assembly", childId: "eukaryote-haplotype-raw-assembly" },
      { labelKey: "routes.submit.tree.options.eukaryote-haplotype.eukaryote-haplotype-assembly-only", childId: "eukaryote-haplotype-assembly-only" },
    ],
    parentId: "eukaryote",
  },
  {
    id: "eukaryote-est",
    type: "question",
    questionKey: "routes.submit.tree.questions.eukaryote-est",
    options: [
      { labelKey: "routes.submit.tree.options.eukaryote-est.eukaryote-est-small", childId: "eukaryote-est-small" },
      { labelKey: "routes.submit.tree.options.eukaryote-est.eukaryote-est-large", childId: "eukaryote-est-large" },
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
