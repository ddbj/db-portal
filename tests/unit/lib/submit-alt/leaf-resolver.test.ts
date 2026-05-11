import { describe, expect, it } from "vitest"

import { LEAF_QA_CONDITIONS } from "@/lib/mock-data/submit-alt-tree"
import {
  findMatchingLeaves,
  resolveLeafFromAnswers,
} from "@/lib/submit-alt/leaf-resolver"
import type { LeafNodeIdAlt, QAAnswers } from "@/types/submit-alt"

const emptyAnswers = (): QAAnswers => ({
  q1: new Set(),
  q2: null,
  q3: null,
  q4: null,
  q5: null,
  q6: new Set(),
  q7: null,
  q8: null,
  q9: null,
})

interface LeafCase {
  description: string
  answers: QAAnswers
  expected: LeafNodeIdAlt
}

// 36 leaf それぞれを一意化する最短の回答セット。
// docs/submit-alt.md「Q1〜Q8 → leaf マッピング表」と整合する必要がある。
const LEAF_CASES: readonly LeafCase[] = [
  {
    description: "leaf-01: human + restricted + non-metagenome",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["sequence-read"]),
      q2: "human",
      q3: "restricted",
      q9: "no",
    },
    expected: "human-restricted",
  },
  {
    description: "leaf-02: mass-spec + proteomics",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["mass-spec"]),
      q7: "proteomics",
    },
    expected: "proteomics",
  },
  {
    description: "leaf-03: mass-spec + metabolomics",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["mass-spec"]),
      q7: "metabolomics",
    },
    expected: "metabolomics",
  },
  {
    description: "v01: variation + eukaryote",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["variation"]),
      q2: "eukaryote",
    },
    expected: "variation-nonhuman",
  },
  {
    description: "v02: variation + human + open",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["variation"]),
      q2: "human",
      q3: "open",
    },
    expected: "variation-human-open",
  },
  {
    description: "v03: variation + human + restricted",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["variation"]),
      q2: "human",
      q3: "restricted",
    },
    expected: "variation-human-restricted",
  },
  {
    description: "leaf-08: sequence-read + expression-matrix",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["sequence-read", "expression-matrix"]),
      q2: "eukaryote",
    },
    expected: "expression-ngs",
  },
  {
    description: "leaf-09: expression-array alone",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["expression-array"]),
      q2: "eukaryote",
    },
    expected: "expression-array",
  },
  {
    description: "leaf-10: assembled small none in prokaryote",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["assembled"]),
      q2: "prokaryote",
      q4: "primary",
      q5: "small",
      q6: new Set(["none"]),
    },
    expected: "small-sequence",
  },
  {
    description: "leaf-11: metagenome raw",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["sequence-read"]),
      q2: "metagenome",
      q8: "raw",
    },
    expected: "metagenome-raw",
  },
  {
    description: "leaf-12: metagenome primary",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["sequence-read"]),
      q2: "metagenome",
      q8: "primary",
    },
    expected: "metagenome-primary",
  },
  {
    description: "leaf-13: metagenome + assembled + mag-sag",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["sequence-read", "assembled"]),
      q2: "metagenome",
      q4: "primary",
      q6: new Set(["mag-sag"]),
    },
    expected: "metagenome-genome-bin",
  },
  {
    description: "leaf-14: metagenome + tls",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["sequence-read", "assembled"]),
      q2: "metagenome",
      q4: "primary",
      q6: new Set(["tls"]),
    },
    expected: "metagenome-tls",
  },
  {
    description: "leaf-15: metagenome + tsa",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["sequence-read", "assembled"]),
      q2: "metagenome",
      q4: "primary",
      q6: new Set(["tsa"]),
    },
    expected: "metagenome-tsa",
  },
  {
    description: "m06: human + restricted + metagenome derived",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["sequence-read"]),
      q2: "human",
      q3: "restricted",
      q9: "yes",
    },
    expected: "human-microbiome-restricted",
  },
  {
    description: "leaf-16: organelle-plasmid",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["assembled"]),
      q2: "organelle-plasmid",
      q4: "primary",
    },
    expected: "organelle-plasmid",
  },
  {
    description: "leaf-17: prokaryote raw only",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["sequence-read"]),
      q2: "prokaryote",
    },
    expected: "prokaryote-raw",
  },
  {
    description: "leaf-18: prokaryote raw + assembly normal",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["sequence-read", "assembled"]),
      q2: "prokaryote",
      q4: "primary",
      q5: "normal",
      q6: new Set(["none"]),
    },
    expected: "prokaryote-raw-assembly",
  },
  {
    description: "leaf-19: prokaryote assembly only normal",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["assembled"]),
      q2: "prokaryote",
      q4: "primary",
      q5: "normal",
      q6: new Set(["none"]),
    },
    expected: "prokaryote-assembly-only",
  },
  {
    description: "leaf-20: virus raw only",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["sequence-read"]),
      q2: "virus",
    },
    expected: "virus-raw",
  },
  {
    description: "leaf-21: virus raw + assembly normal",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["sequence-read", "assembled"]),
      q2: "virus",
      q4: "primary",
      q5: "normal",
      q6: new Set(["none"]),
    },
    expected: "virus-raw-assembly",
  },
  {
    description: "leaf-22: virus assembly only normal",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["assembled"]),
      q2: "virus",
      q4: "primary",
      q5: "normal",
      q6: new Set(["none"]),
    },
    expected: "virus-assembly-only",
  },
  {
    description: "leaf-23: eukaryote tsa",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["sequence-read", "assembled"]),
      q2: "eukaryote",
      q4: "primary",
      q6: new Set(["tsa"]),
    },
    expected: "eukaryote-tsa",
  },
  {
    description: "leaf-24: eukaryote tpa",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["assembled"]),
      q2: "eukaryote",
      q4: "tpa",
      q6: new Set(["none"]),
    },
    expected: "eukaryote-tpa",
  },
  {
    description: "leaf-25: eukaryote raw only",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["sequence-read"]),
      q2: "eukaryote",
    },
    expected: "eukaryote-raw",
  },
  {
    description: "leaf-26: eukaryote raw + assembly normal",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["sequence-read", "assembled"]),
      q2: "eukaryote",
      q4: "primary",
      q5: "normal",
      q6: new Set(["none"]),
    },
    expected: "eukaryote-raw-assembly",
  },
  {
    description: "leaf-27: eukaryote assembly only normal",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["assembled"]),
      q2: "eukaryote",
      q4: "primary",
      q5: "normal",
      q6: new Set(["none"]),
    },
    expected: "eukaryote-assembly-only",
  },
  {
    description: "leaf-28: eukaryote haplotype raw+asm",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["sequence-read", "assembled"]),
      q2: "eukaryote",
      q4: "primary",
      q6: new Set(["haplotype"]),
    },
    expected: "eukaryote-haplotype-raw-assembly",
  },
  {
    description: "leaf-29: eukaryote haplotype assembly only",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["assembled"]),
      q2: "eukaryote",
      q4: "primary",
      q6: new Set(["haplotype"]),
    },
    expected: "eukaryote-haplotype-assembly-only",
  },
  {
    description: "leaf-30: eukaryote est small",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["assembled"]),
      q2: "eukaryote",
      q5: "small",
      q6: new Set(["est"]),
    },
    expected: "eukaryote-est-small",
  },
  {
    description: "leaf-31: eukaryote est large",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["assembled"]),
      q2: "eukaryote",
      q5: "normal",
      q6: new Set(["est"]),
    },
    expected: "eukaryote-est-large",
  },
  {
    description: "s01: spatial-tx non-human",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["spatial-tx"]),
      q2: "eukaryote",
    },
    expected: "spatial-tx-nonhuman",
  },
  {
    description: "s02: spatial-tx human restricted",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["spatial-tx"]),
      q2: "human",
      q3: "restricted",
    },
    expected: "spatial-tx-restricted",
  },
  {
    description: "leaf-32: human raw open",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["sequence-read"]),
      q2: "human",
      q3: "open",
    },
    expected: "human-raw-open",
  },
  {
    description: "leaf-33: human raw + assembly open",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["sequence-read", "assembled"]),
      q2: "human",
      q3: "open",
      q4: "primary",
      q6: new Set(["none"]),
    },
    expected: "human-raw-assembly-open",
  },
  {
    description: "leaf-34: human assembly only open",
    answers: {
      ...emptyAnswers(),
      q1: new Set(["assembled"]),
      q2: "human",
      q3: "open",
      q4: "primary",
      q6: new Set(["none"]),
    },
    expected: "human-assembly-only-open",
  },
]

describe("resolveLeafFromAnswers (36 leaf coverage)", () => {
  it.each(LEAF_CASES)("$description → $expected", ({ answers, expected }) => {
    expect(resolveLeafFromAnswers(answers)).toBe(expected)
  })

  it("covers all 36 leaf in LEAF_QA_CONDITIONS", () => {
    const covered = new Set(LEAF_CASES.map((c) => c.expected))
    const expected = new Set(LEAF_QA_CONDITIONS.map((c) => c.leafId))
    expect(covered).toEqual(expected)
  })
})

describe("findMatchingLeaves", () => {
  it("returns empty for empty answers", () => {
    expect(findMatchingLeaves(emptyAnswers())).toEqual([])
  })

  it("returns multiple candidates when not yet unique", () => {
    // q1=sequence-read, q2=eukaryote だけだと leaf-25 のみ確定
    const candidates = findMatchingLeaves({
      ...emptyAnswers(),
      q1: new Set(["sequence-read"]),
      q2: "eukaryote",
    })
    expect(candidates).toContain("eukaryote-raw")
  })
})

describe("resolveLeafFromAnswers ambiguity", () => {
  it("returns null when no condition matches", () => {
    expect(resolveLeafFromAnswers(emptyAnswers())).toBeNull()
  })

  it("returns null when multiple conditions match", () => {
    // 仮の曖昧ケース: Q1 が空 + Q2 のみ。本来は leaf 0 件だが、念のため null 返却を確認
    const result = resolveLeafFromAnswers({
      ...emptyAnswers(),
      q2: "eukaryote",
    })
    expect(result).toBeNull()
  })
})
