import type {
  LeafNodeAlt,
  LeafNodeIdAlt,
  QuestionNodeAlt,
  TreeNodeAlt,
} from "@/types/submit-alt"

import {
  LEAF_GOALS_ALT,
  LEAF_LEGACY_ID,
  LEAF_PARENTS_ALT,
  LEAF_VENUE_ALT,
} from "./leafGoals"

// docs/submit-alt.md L142-188 の tree 構造を反映する 10 個の question node。
// 起点 (root) 5 個 + 中間 node 5 個。
const QUESTION_NODES_ALT: readonly QuestionNodeAlt[] = [
  // 起点 (root)
  {
    id: "genome",
    type: "question",
    isRoot: true,
    questionKey: "routes.submitAlt.tree.questions.genome",
    options: [
      {
        labelKey: "routes.submitAlt.tree.options.genome.eukaryote",
        childId: "genome-eukaryote",
      },
      {
        labelKey: "routes.submitAlt.tree.options.genome.prokaryote",
        childId: "genome-prokaryote",
      },
      {
        labelKey: "routes.submitAlt.tree.options.genome.virus",
        childId: "genome-virus",
      },
      {
        labelKey: "routes.submitAlt.tree.options.genome.organelle-plasmid",
        childId: "organelle-plasmid",
      },
      {
        labelKey: "routes.submitAlt.tree.options.genome.metagenome",
        childId: "genome-metagenome",
      },
    ],
    parentId: null,
  },
  {
    id: "sequence-read",
    type: "question",
    isRoot: true,
    questionKey: "routes.submitAlt.tree.questions.sequence-read",
    options: [
      {
        labelKey: "routes.submitAlt.tree.options.sequence-read.eukaryote-raw",
        childId: "eukaryote-raw",
      },
      {
        labelKey: "routes.submitAlt.tree.options.sequence-read.prokaryote-raw",
        childId: "prokaryote-raw",
      },
      {
        labelKey: "routes.submitAlt.tree.options.sequence-read.virus-raw",
        childId: "virus-raw",
      },
      {
        labelKey: "routes.submitAlt.tree.options.sequence-read.expression-ngs",
        childId: "expression-ngs",
      },
      {
        labelKey: "routes.submitAlt.tree.options.sequence-read.metagenome",
        childId: "sequence-read-metagenome",
      },
    ],
    parentId: null,
  },
  {
    id: "variation",
    type: "question",
    isRoot: true,
    questionKey: "routes.submitAlt.tree.questions.variation",
    options: [
      {
        labelKey: "routes.submitAlt.tree.options.variation.nonhuman",
        childId: "variation-nonhuman",
      },
      {
        labelKey: "routes.submitAlt.tree.options.variation.human-open",
        childId: "variation-human-open",
      },
      {
        labelKey: "routes.submitAlt.tree.options.variation.human-restricted",
        childId: "variation-human-restricted",
      },
    ],
    parentId: null,
  },
  {
    id: "spatial-transcriptomics",
    type: "question",
    isRoot: true,
    questionKey: "routes.submitAlt.tree.questions.spatial-transcriptomics",
    options: [
      {
        labelKey: "routes.submitAlt.tree.options.spatial-transcriptomics.nonhuman",
        childId: "spatial-tx-nonhuman",
      },
      {
        labelKey: "routes.submitAlt.tree.options.spatial-transcriptomics.restricted",
        childId: "spatial-tx-restricted",
      },
    ],
    parentId: null,
  },
  {
    id: "est",
    type: "question",
    isRoot: true,
    questionKey: "routes.submitAlt.tree.questions.est",
    options: [
      {
        labelKey: "routes.submitAlt.tree.options.est.small",
        childId: "eukaryote-est-small",
      },
      {
        labelKey: "routes.submitAlt.tree.options.est.large",
        childId: "eukaryote-est-large",
      },
    ],
    parentId: null,
  },
  // 中間 node
  {
    id: "genome-eukaryote",
    type: "question",
    isRoot: false,
    questionKey: "routes.submitAlt.tree.questions.genome-eukaryote",
    options: [
      {
        labelKey: "routes.submitAlt.tree.options.genome-eukaryote.raw-assembly",
        childId: "eukaryote-raw-assembly",
      },
      {
        labelKey: "routes.submitAlt.tree.options.genome-eukaryote.assembly-only",
        childId: "eukaryote-assembly-only",
      },
      {
        labelKey: "routes.submitAlt.tree.options.genome-eukaryote.haplotype-raw-assembly",
        childId: "eukaryote-haplotype-raw-assembly",
      },
      {
        labelKey: "routes.submitAlt.tree.options.genome-eukaryote.haplotype-assembly-only",
        childId: "eukaryote-haplotype-assembly-only",
      },
      {
        labelKey: "routes.submitAlt.tree.options.genome-eukaryote.tsa",
        childId: "eukaryote-tsa",
      },
      {
        labelKey: "routes.submitAlt.tree.options.genome-eukaryote.tpa",
        childId: "eukaryote-tpa",
      },
    ],
    parentId: "genome",
  },
  {
    id: "genome-prokaryote",
    type: "question",
    isRoot: false,
    questionKey: "routes.submitAlt.tree.questions.genome-prokaryote",
    options: [
      {
        labelKey: "routes.submitAlt.tree.options.genome-prokaryote.raw-assembly",
        childId: "prokaryote-raw-assembly",
      },
      {
        labelKey: "routes.submitAlt.tree.options.genome-prokaryote.assembly-only",
        childId: "prokaryote-assembly-only",
      },
    ],
    parentId: "genome",
  },
  {
    id: "genome-virus",
    type: "question",
    isRoot: false,
    questionKey: "routes.submitAlt.tree.questions.genome-virus",
    options: [
      {
        labelKey: "routes.submitAlt.tree.options.genome-virus.raw-assembly",
        childId: "virus-raw-assembly",
      },
      {
        labelKey: "routes.submitAlt.tree.options.genome-virus.assembly-only",
        childId: "virus-assembly-only",
      },
    ],
    parentId: "genome",
  },
  {
    id: "genome-metagenome",
    type: "question",
    isRoot: false,
    questionKey: "routes.submitAlt.tree.questions.genome-metagenome",
    options: [
      {
        labelKey: "routes.submitAlt.tree.options.genome-metagenome.genome-bin",
        childId: "metagenome-genome-bin",
      },
      {
        labelKey: "routes.submitAlt.tree.options.genome-metagenome.tls",
        childId: "metagenome-tls",
      },
      {
        labelKey: "routes.submitAlt.tree.options.genome-metagenome.tsa",
        childId: "metagenome-tsa",
      },
      {
        labelKey: "routes.submitAlt.tree.options.genome-metagenome.human-restricted",
        childId: "human-microbiome-restricted",
      },
    ],
    parentId: "genome",
  },
  {
    id: "sequence-read-metagenome",
    type: "question",
    isRoot: false,
    questionKey: "routes.submitAlt.tree.questions.sequence-read-metagenome",
    options: [
      {
        labelKey: "routes.submitAlt.tree.options.sequence-read-metagenome.raw",
        childId: "metagenome-raw",
      },
      {
        labelKey: "routes.submitAlt.tree.options.sequence-read-metagenome.primary",
        childId: "metagenome-primary",
      },
    ],
    parentId: "sequence-read",
  },
]

const LEAF_NODES_ALT: readonly LeafNodeAlt[] = (
  Object.keys(LEAF_GOALS_ALT) as LeafNodeIdAlt[]
).map((leafId) => ({
  id: leafId,
  type: "leaf",
  legacyId: LEAF_LEGACY_ID[leafId],
  goal: LEAF_GOALS_ALT[leafId],
  venue: LEAF_VENUE_ALT[leafId],
  parentId: LEAF_PARENTS_ALT[leafId],
}))

export const TREE_NODES_ALT: readonly TreeNodeAlt[] = [
  ...QUESTION_NODES_ALT,
  ...LEAF_NODES_ALT,
]
