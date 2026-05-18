// flow-rules.md §8.2 代表例 1-12 の Submission 雛形 fixture
// Phase D の golden test 元データ用。
//
// 各 fixture は reducer の add-file/edit-cell/set-chip 呼び出しを最小限まとめて
// `Submission` 状態を組み立てる。

import { submissionReducer } from "@/lib/submit-alt3/reducer"
import {
  type AccessRestriction,
  createEmptySubmission,
  type Organism,
  type Submission,
} from "@/types/submit-alt3"

// 全 file に organism / accessRestriction を一括設定する helper
const setColumnAll = (
  submission: Submission,
  organism: Organism,
  access: AccessRestriction,
): Submission => {
  let s = submission
  for (const f of s.fileEntries) {
    s = submissionReducer(s, {
      type: "edit-cell",
      payload: { fileId: f.id, column: "organism", value: organism },
    })
    s = submissionReducer(s, {
      type: "edit-cell",
      payload: { fileId: f.id, column: "accessRestriction", value: access },
    })
  }

  return s
}

// ----- Example 1: prokaryote raw + assembly (Rule 1/3/4 + data-model §4.3.1 同 sample 関連付け) -----
//
// raw pair-end と assembly fasta は同 sample 由来なので、assembly add-file 時に
// `linkToBsId="bs-1"` を渡して raw Group の BS に集約する (UI では AssembledModal の
// 「既存 BS と関連付け」select で選ぶフロー)。これにより 4 Step (BP + BS + DRA + MSS) に正規化。

export const example1ProkaryoteRawAssembly = (): Submission => {
  let s = createEmptySubmission()

  // pair-end raw FASTQ
  s = submissionReducer(s, {
    type: "add-file",
    payload: {
      buttonType: "sequence-read",
      groupType: "pair-end",
      members: [
        { displayName: "sample_R1.fastq", role: "r1" },
        { displayName: "sample_R2.fastq", role: "r2" },
      ],
      defaultDataForm: "raw",
    },
  })
  // assembly fasta + WGS chip。raw Group の BS (bs-1) と関連付け
  s = submissionReducer(s, {
    type: "add-file",
    payload: {
      buttonType: "assembled",
      groupType: "single",
      members: [{ displayName: "assembly.fa", role: "fasta-assembly" }],
      defaultDataForm: "assembled",
      chipTags: [{ axis: "assembly-form", value: "wgs" }],
      linkToBsId: "bs-1",
    },
  })

  return setColumnAll(s, "prokaryote", "open")
}

// ----- Example 2: human restricted raw + per-sample VCF (Rule 6a JGA 集約) -----

export const example2HumanRestrictedVcf = (): Submission => {
  let s = createEmptySubmission()

  // pair-end raw FASTQ
  s = submissionReducer(s, {
    type: "add-file",
    payload: {
      buttonType: "sequence-read",
      groupType: "pair-end",
      members: [
        { displayName: "sample_R1.fastq", role: "r1" },
        { displayName: "sample_R2.fastq", role: "r2" },
      ],
      defaultDataForm: "raw",
    },
  })
  // per-sample VCF (snp-indel)
  s = submissionReducer(s, {
    type: "add-file",
    payload: {
      buttonType: "variation",
      groupType: "single",
      members: [{ displayName: "variants.vcf", role: "vcf" }],
      defaultDataForm: "analysis-output",
      chipTags: [
        { axis: "variation-form", value: "per-sample" },
        { axis: "variation-type", value: "snp-indel" },
      ],
    },
  })

  return setColumnAll(s, "human", "restricted")
}

// ----- Example 3: metagenome MAG chain (Rule 8) -----

export const example3MetagenomeMagChain = (): Submission => {
  let s = createEmptySubmission()

  // 単一 mag-sag-chain Group に raw + binned + MAG の 4 file を集約
  s = submissionReducer(s, {
    type: "add-file",
    payload: {
      buttonType: "sequence-read",
      groupType: "mag-sag-chain",
      members: [
        { displayName: "meta_R1.fastq", role: "r1" },
        { displayName: "meta_R2.fastq", role: "r2" },
        { displayName: "binned.fa", role: "binned-fasta" },
        { displayName: "mag_001.fa", role: "mag-fasta" },
      ],
      defaultDataForm: "raw",
      chipTags: [{ axis: "assembly-form", value: "mag" }],
    },
  })

  s = setColumnAll(s, "metagenome", "open")

  // mag-fasta 行だけ dataForm=assembled に
  const magFile = s.fileEntries.find((f) => f.role === "mag-fasta")
  if (magFile) {
    s = submissionReducer(s, {
      type: "edit-cell",
      payload: { fileId: magFile.id, column: "dataForm", value: "assembled" },
    })
  }
  const binnedFile = s.fileEntries.find((f) => f.role === "binned-fasta")
  if (binnedFile) {
    s = submissionReducer(s, {
      type: "edit-cell",
      payload: { fileId: binnedFile.id, column: "dataForm", value: "analysis-output" },
    })
  }

  return s
}

// ----- Example 4: host (human restricted) + pathogen (prokaryote open) 混合
//                  (Rule 5 系統距離分裂 + Rule 2 Umbrella BP + Rule 6 JGA 集約) -----

export const example4HostPathogenMix = (): Submission => {
  let s = createEmptySubmission()

  // host pair-end FASTQ (human restricted)
  s = submissionReducer(s, {
    type: "add-file",
    payload: {
      buttonType: "sequence-read",
      groupType: "pair-end",
      members: [
        { displayName: "host_R1.fastq", role: "r1" },
        { displayName: "host_R2.fastq", role: "r2" },
      ],
      defaultDataForm: "raw",
    },
  })
  for (const f of s.fileEntries) {
    s = submissionReducer(s, {
      type: "edit-cell",
      payload: { fileId: f.id, column: "organism", value: "human" },
    })
    s = submissionReducer(s, {
      type: "edit-cell",
      payload: { fileId: f.id, column: "accessRestriction", value: "restricted" },
    })
  }

  // pathogen pair-end FASTQ (prokaryote open)
  s = submissionReducer(s, {
    type: "add-file",
    payload: {
      buttonType: "sequence-read",
      groupType: "pair-end",
      members: [
        { displayName: "pathogen_R1.fastq", role: "r1" },
        { displayName: "pathogen_R2.fastq", role: "r2" },
      ],
      defaultDataForm: "raw",
    },
  })
  // pathogen assembly (prokaryote open)
  s = submissionReducer(s, {
    type: "add-file",
    payload: {
      buttonType: "assembled",
      groupType: "single",
      members: [{ displayName: "pathogen_assembly.fa", role: "fasta-assembly" }],
      defaultDataForm: "assembled",
      chipTags: [{ axis: "assembly-form", value: "wgs" }],
    },
  })

  // pathogen 行 (後から追加された 3 file) のみ organism=prokaryote, access=open に上書き
  const pathogenFiles = s.fileEntries.filter(
    (f) => f.displayName.startsWith("pathogen_"),
  )
  for (const f of pathogenFiles) {
    s = submissionReducer(s, {
      type: "edit-cell",
      payload: { fileId: f.id, column: "organism", value: "prokaryote" },
    })
    s = submissionReducer(s, {
      type: "edit-cell",
      payload: { fileId: f.id, column: "accessRestriction", value: "open" },
    })
  }

  return s
}

// ----- Example 5: phenotype-only Dataset (Rule 6c / Rule 10) -----

export const example5PhenotypeOnly = (): Submission => {
  let s = createEmptySubmission()

  s = submissionReducer(s, {
    type: "add-file",
    payload: {
      buttonType: "phenotype",
      groupType: "single",
      members: [{ displayName: "phenotype.tsv", role: "phenotype-table" }],
      defaultDataForm: "phenotype",
    },
  })

  return setColumnAll(s, "human", "restricted")
}

// ----- Example 6: multiplex Run (Rule 9) -----

export const example6MultiplexRun = (): Submission => {
  let s = createEmptySubmission()

  s = submissionReducer(s, {
    type: "add-file",
    payload: {
      buttonType: "sequence-read",
      groupType: "multiplex",
      members: [
        { displayName: "sample01.fastq", role: "demultiplexed-per-sample" },
        { displayName: "sample02.fastq", role: "demultiplexed-per-sample" },
        { displayName: "sample03.fastq", role: "demultiplexed-per-sample" },
      ],
      defaultDataForm: "raw",
    },
  })

  return setColumnAll(s, "prokaryote", "open")
}

// ----- Example 7: Hybrid Assembly (short + long + assembled、Rule 15) -----
//
// flow-rules.md §8.2 例 7 の SSOT 理想形は「hybrid メタ Group が短/長 2 子 Group を memberGroupIds で束ねる」だが、
// Phase A reducer の add-file には memberGroupIds を直接設定する手段がない。
// PoC では「短鎖 pair-end + 長鎖 single + 組み立て fasta の 3 個独立 Group」として組み立て、
// flowGeneration の現状出力を golden として固定する (Rule 15 メタ Group は本 fixture では生成されない)。
//
// 同 sample 関連付け版 (`example7HybridAssemblyLinked`) では assembly fasta を短鎖 raw の BS に
// 関連付け、Hybrid 構成全体で 1 BS に集約する PoC 実装可能形を例示する (data-model §4.3.1)。

export const example7HybridAssembly = (): Submission => {
  let s = createEmptySubmission()

  // short-read pair-end FASTQ
  s = submissionReducer(s, {
    type: "add-file",
    payload: {
      buttonType: "sequence-read",
      groupType: "pair-end",
      members: [
        { displayName: "short_R1.fastq", role: "r1" },
        { displayName: "short_R2.fastq", role: "r2" },
      ],
      defaultDataForm: "raw",
    },
  })
  // long-read single FASTQ
  s = submissionReducer(s, {
    type: "add-file",
    payload: {
      buttonType: "sequence-read",
      groupType: "single",
      members: [{ displayName: "longread.fastq", role: "long-read" }],
      defaultDataForm: "raw",
    },
  })
  // hybrid assembly FASTA
  s = submissionReducer(s, {
    type: "add-file",
    payload: {
      buttonType: "assembled",
      groupType: "single",
      members: [{ displayName: "assembly.fa", role: "fasta-assembly" }],
      defaultDataForm: "assembled",
      chipTags: [{ axis: "assembly-form", value: "wgs" }],
    },
  })

  return setColumnAll(s, "prokaryote", "open")
}

// ----- Example 7-linked: Hybrid Assembly (short + long + assembled、3 Group + 同 sample 関連付け) -----
//
// 短鎖 pair-end + 長鎖 single + assembly fasta の 3 Group。長鎖 / assembly を短鎖 raw の BS と
// 関連付けて 1 BS に集約 (Hybrid Assembly メタ Group の代替表現)。
// 期待 Step: BP + BS×1 + DRA×2 (短鎖/長鎖) + MSS×1 = 5 Step

export const example7HybridAssemblyLinked = (): Submission => {
  let s = createEmptySubmission()

  // short-read pair-end FASTQ → bs-1
  s = submissionReducer(s, {
    type: "add-file",
    payload: {
      buttonType: "sequence-read",
      groupType: "pair-end",
      members: [
        { displayName: "short_R1.fastq", role: "r1" },
        { displayName: "short_R2.fastq", role: "r2" },
      ],
      defaultDataForm: "raw",
    },
  })
  // long-read single FASTQ → bs-1 に関連付け
  s = submissionReducer(s, {
    type: "add-file",
    payload: {
      buttonType: "sequence-read",
      groupType: "single",
      members: [{ displayName: "longread.fastq", role: "long-read" }],
      defaultDataForm: "raw",
      linkToBsId: "bs-1",
    },
  })
  // hybrid assembly FASTA → bs-1 に関連付け
  s = submissionReducer(s, {
    type: "add-file",
    payload: {
      buttonType: "assembled",
      groupType: "single",
      members: [{ displayName: "assembly.fa", role: "fasta-assembly" }],
      defaultDataForm: "assembled",
      chipTags: [{ axis: "assembly-form", value: "wgs" }],
      linkToBsId: "bs-1",
    },
  })

  return setColumnAll(s, "prokaryote", "open")
}

// ----- Example 8: variation aggregate (TogoVar SNP、Rule 4a) -----

export const example8VariationAggregate = (): Submission => {
  let s = createEmptySubmission()

  s = submissionReducer(s, {
    type: "add-file",
    payload: {
      buttonType: "variation",
      groupType: "single",
      members: [{ displayName: "aggregate.vcf", role: "vcf" }],
      defaultDataForm: "analysis-output",
      chipTags: [
        { axis: "variation-form", value: "aggregate" },
        { axis: "variation-type", value: "snp-indel" },
      ],
    },
  })

  return setColumnAll(s, "human", "open")
}

// ----- Example 9: Haplotype phased (Rule 11) -----

export const example9HaplotypePhased = (): Submission => {
  let s = createEmptySubmission()

  // raw pair-end (両 Haplotype 混在)
  s = submissionReducer(s, {
    type: "add-file",
    payload: {
      buttonType: "sequence-read",
      groupType: "pair-end",
      members: [
        { displayName: "reads_R1.fastq", role: "r1" },
        { displayName: "reads_R2.fastq", role: "r2" },
      ],
      defaultDataForm: "raw",
    },
  })

  // Principal assembly
  s = submissionReducer(s, {
    type: "add-file",
    payload: {
      buttonType: "assembled",
      groupType: "assembly-annotation",
      members: [{ displayName: "primary.fa", role: "fasta-assembly" }],
      defaultDataForm: "assembled",
      chipTags: [
        { axis: "assembly-form", value: "wgs" },
        { axis: "haplotype-mode", value: "phased" },
        { axis: "haplotype-naming", value: "principal-alternate" },
      ],
    },
  })

  // Alternate assembly
  s = submissionReducer(s, {
    type: "add-file",
    payload: {
      buttonType: "assembled",
      groupType: "assembly-annotation",
      members: [{ displayName: "alternate.fa", role: "fasta-assembly" }],
      defaultDataForm: "assembled",
      chipTags: [
        { axis: "assembly-form", value: "wgs" },
        { axis: "haplotype-mode", value: "phased" },
        { axis: "haplotype-naming", value: "principal-alternate" },
      ],
    },
  })

  return setColumnAll(s, "eukaryote", "open")
}

// ----- Example 10: TPA-WGS 再アセンブル (Rule 7a) -----

export const example10TpaWgsReassembly = (): Submission => {
  let s = createEmptySubmission()

  s = submissionReducer(s, {
    type: "add-file",
    payload: {
      buttonType: "assembled",
      groupType: "single",
      members: [{ displayName: "reassembly.fa", role: "fasta-assembly" }],
      defaultDataForm: "assembled",
      chipTags: [
        { axis: "assembly-form", value: "wgs" },
        { axis: "provenance", value: "third-party" },
        { axis: "tpa-subtype", value: "tpa-assembly" },
      ],
      groupOverrides: {
        referenceMeta: {
          citedAccessions: ["SRR12345678"],
          pubmedId: "38123456",
        },
      },
    },
  })

  return setColumnAll(s, "prokaryote", "open")
}

// ----- Example 11: metabolomics LC-MS (Rule 4c MetaboBank) -----

export const example11MetabolomicsLcMs = (): Submission => {
  let s = createEmptySubmission()

  s = submissionReducer(s, {
    type: "add-file",
    payload: {
      buttonType: "mass-spec",
      groupType: "single",
      members: [{ displayName: "lc_ms.mzML", role: "raw" }],
      defaultDataForm: "mass-spec",
      chipTags: [{ axis: "mass-spec-domain", value: "metabolomics" }],
      groupOverrides: {
        metaboBankSubmissionType: "LC-MS",
      },
    },
  })

  return setColumnAll(s, "eukaryote", "open")
}

// ----- Example 12: third-party annotation (Rule 7c notes-only) -----

export const example12ThirdPartyAnnotation = (): Submission => {
  let s = createEmptySubmission()

  s = submissionReducer(s, {
    type: "add-file",
    payload: {
      buttonType: "annotation",
      groupType: "single",
      members: [{ displayName: "annotation.gff", role: "gff-annotation" }],
      defaultDataForm: "annotation",
      chipTags: [{ axis: "provenance", value: "third-party" }],
      groupOverrides: {
        referenceMeta: {
          citedAccessions: ["AB12345678"],
          pubmedId: "38987654",
        },
      },
    },
  })

  return setColumnAll(s, "eukaryote", "open")
}

// 利用しやすいよう dictionary でも export
export const flowRulesExamples = {
  example1ProkaryoteRawAssembly,
  example2HumanRestrictedVcf,
  example3MetagenomeMagChain,
  example4HostPathogenMix,
  example5PhenotypeOnly,
  example6MultiplexRun,
  example7HybridAssembly,
  example7HybridAssemblyLinked,
  example8VariationAggregate,
  example9HaplotypePhased,
  example10TpaWgsReassembly,
  example11MetabolomicsLcMs,
  example12ThirdPartyAnnotation,
} as const
