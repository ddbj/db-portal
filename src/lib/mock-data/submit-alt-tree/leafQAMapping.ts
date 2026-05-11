import type {
  LeafNodeIdAlt,
  Q1Id,
  Q2Id,
  Q3Id,
  Q4Id,
  Q5Id,
  Q6Id,
  Q7Id,
  Q8Id,
  Q9Id,
} from "@/types/submit-alt"

// 36 leaf を Q1-Q9 軸で一意化するためのマッピング表。
// docs/submit-alt.md「Q1〜Q8 → leaf マッピング表」参照。
//
// 判定ルール:
//   - q1: ReadonlySet<Q1Id> を mustHave (含むべき値) と mustNotHave (含んではいけない値) で表現
//   - q2-q9: 単一値 (null = 任意 / その質問が leaf 識別に使われない)
//   - Q6 は複数選択可だが、leaf 識別では特定値の含有を確認する (mustHaveQ6)
//
// 評価は「上から順に最初にマッチした leaf を返す」セマンティクスではなく、
// 「条件をすべて満たす leaf を抽出して一意なら確定」とする。
// 一意でなければ leaf 未確定（追加の質問回答が必要）。

export interface LeafCondition {
  leafId: LeafNodeIdAlt
  q1MustHave: readonly Q1Id[]
  q1MustNotHave?: readonly Q1Id[]
  q2?: Q2Id
  q2In?: readonly Q2Id[]
  q3?: Q3Id
  q4?: Q4Id
  q5?: Q5Id
  q6MustHave?: readonly Q6Id[]
  q7?: Q7Id
  q8?: Q8Id
  q9?: Q9Id
}

export const LEAF_QA_CONDITIONS: readonly LeafCondition[] = [
  {
    leafId: "human-restricted",
    q1MustHave: [],
    q2: "human",
    q3: "restricted",
    q9: "no",
  },
  {
    leafId: "proteomics",
    q1MustHave: ["mass-spec"],
    q7: "proteomics",
  },
  {
    leafId: "metabolomics",
    q1MustHave: ["mass-spec"],
    q7: "metabolomics",
  },
  {
    leafId: "variation-nonhuman",
    q1MustHave: ["variation"],
    q2In: ["eukaryote", "prokaryote", "virus", "metagenome"],
  },
  {
    leafId: "variation-human-open",
    q1MustHave: ["variation"],
    q2: "human",
    q3: "open",
  },
  {
    leafId: "variation-human-restricted",
    q1MustHave: ["variation"],
    q2: "human",
    q3: "restricted",
  },
  {
    leafId: "expression-ngs",
    q1MustHave: ["sequence-read", "expression-matrix"],
  },
  {
    leafId: "expression-array",
    q1MustHave: ["expression-array"],
    q1MustNotHave: ["sequence-read"],
  },
  {
    leafId: "small-sequence",
    q1MustHave: ["assembled"],
    q2In: ["prokaryote", "eukaryote", "virus", "organelle-plasmid"],
    q4: "primary",
    q5: "small",
    q6MustHave: ["none"],
  },
  {
    leafId: "metagenome-raw",
    q1MustHave: ["sequence-read"],
    q1MustNotHave: ["assembled", "expression-matrix"],
    q2: "metagenome",
    q8: "raw",
  },
  {
    leafId: "metagenome-primary",
    q1MustHave: ["sequence-read"],
    q1MustNotHave: ["assembled", "expression-matrix"],
    q2: "metagenome",
    q8: "primary",
  },
  {
    leafId: "metagenome-genome-bin",
    q1MustHave: ["sequence-read", "assembled"],
    q2: "metagenome",
    q4: "primary",
    q6MustHave: ["mag-sag"],
  },
  {
    leafId: "metagenome-tls",
    q1MustHave: ["sequence-read", "assembled"],
    q2: "metagenome",
    q4: "primary",
    q6MustHave: ["tls"],
  },
  {
    leafId: "metagenome-tsa",
    q1MustHave: ["sequence-read", "assembled"],
    q2: "metagenome",
    q4: "primary",
    q6MustHave: ["tsa"],
  },
  {
    leafId: "human-microbiome-restricted",
    q1MustHave: [],
    q2: "human",
    q3: "restricted",
    q9: "yes",
  },
  {
    leafId: "organelle-plasmid",
    q1MustHave: ["assembled"],
    q2: "organelle-plasmid",
    q4: "primary",
  },
  {
    leafId: "prokaryote-raw",
    q1MustHave: ["sequence-read"],
    q1MustNotHave: ["assembled", "expression-matrix"],
    q2: "prokaryote",
  },
  {
    leafId: "prokaryote-raw-assembly",
    q1MustHave: ["sequence-read", "assembled"],
    q2: "prokaryote",
    q4: "primary",
    q5: "normal",
    q6MustHave: ["none"],
  },
  {
    leafId: "prokaryote-assembly-only",
    q1MustHave: ["assembled"],
    q1MustNotHave: ["sequence-read"],
    q2: "prokaryote",
    q4: "primary",
    q5: "normal",
    q6MustHave: ["none"],
  },
  {
    leafId: "virus-raw",
    q1MustHave: ["sequence-read"],
    q1MustNotHave: ["assembled", "expression-matrix"],
    q2: "virus",
  },
  {
    leafId: "virus-raw-assembly",
    q1MustHave: ["sequence-read", "assembled"],
    q2: "virus",
    q4: "primary",
    q5: "normal",
    q6MustHave: ["none"],
  },
  {
    leafId: "virus-assembly-only",
    q1MustHave: ["assembled"],
    q1MustNotHave: ["sequence-read"],
    q2: "virus",
    q4: "primary",
    q5: "normal",
    q6MustHave: ["none"],
  },
  {
    leafId: "eukaryote-tsa",
    q1MustHave: ["sequence-read", "assembled"],
    q2: "eukaryote",
    q4: "primary",
    q6MustHave: ["tsa"],
  },
  {
    leafId: "eukaryote-tpa",
    q1MustHave: ["assembled"],
    q2: "eukaryote",
    q4: "tpa",
    q6MustHave: ["none"],
  },
  {
    leafId: "eukaryote-raw",
    q1MustHave: ["sequence-read"],
    q1MustNotHave: ["assembled", "expression-matrix"],
    q2: "eukaryote",
  },
  {
    leafId: "eukaryote-raw-assembly",
    q1MustHave: ["sequence-read", "assembled"],
    q2: "eukaryote",
    q4: "primary",
    q5: "normal",
    q6MustHave: ["none"],
  },
  {
    leafId: "eukaryote-assembly-only",
    q1MustHave: ["assembled"],
    q1MustNotHave: ["sequence-read"],
    q2: "eukaryote",
    q4: "primary",
    q5: "normal",
    q6MustHave: ["none"],
  },
  {
    leafId: "eukaryote-haplotype-raw-assembly",
    q1MustHave: ["sequence-read", "assembled"],
    q2: "eukaryote",
    q4: "primary",
    q6MustHave: ["haplotype"],
  },
  {
    leafId: "eukaryote-haplotype-assembly-only",
    q1MustHave: ["assembled"],
    q1MustNotHave: ["sequence-read"],
    q2: "eukaryote",
    q4: "primary",
    q6MustHave: ["haplotype"],
  },
  {
    leafId: "eukaryote-est-small",
    q1MustHave: ["assembled"],
    q2: "eukaryote",
    q5: "small",
    q6MustHave: ["est"],
  },
  {
    leafId: "eukaryote-est-large",
    q1MustHave: ["assembled"],
    q2: "eukaryote",
    q5: "normal",
    q6MustHave: ["est"],
  },
  {
    leafId: "spatial-tx-nonhuman",
    q1MustHave: ["spatial-tx"],
    q2In: ["eukaryote", "prokaryote", "virus", "metagenome", "organelle-plasmid"],
  },
  {
    leafId: "spatial-tx-restricted",
    q1MustHave: ["spatial-tx"],
    q2: "human",
    q3: "restricted",
  },
  {
    leafId: "human-raw-open",
    q1MustHave: ["sequence-read"],
    q1MustNotHave: ["assembled", "expression-matrix"],
    q2: "human",
    q3: "open",
  },
  {
    leafId: "human-raw-assembly-open",
    q1MustHave: ["sequence-read", "assembled"],
    q2: "human",
    q3: "open",
    q4: "primary",
    q6MustHave: ["none"],
  },
  {
    leafId: "human-assembly-only-open",
    q1MustHave: ["assembled"],
    q1MustNotHave: ["sequence-read"],
    q2: "human",
    q3: "open",
    q4: "primary",
    q6MustHave: ["none"],
  },
]
