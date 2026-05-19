// defaultPayload helper test
// SSOT: docs/submit-alt3-modals.md §6.2 (default 構成表)

import { describe, expect, it } from "vitest"

import {
  BUTTON_BASE_NAME_PREFIX,
  buildDefaultAddFilePayload,
  nextBaseName,
} from "@/lib/submit-alt3/defaultPayload"
import { submissionReducer } from "@/lib/submit-alt3/reducer"
import {
  type ButtonType,
  createEmptySubmission,
  type Submission,
} from "@/types/submit-alt3"

const ALL_BUTTONS: readonly ButtonType[] = [
  "sequence-read",
  "assembled",
  "annotation",
  "variation",
  "phenotype",
  "expression-array",
  "expression-matrix",
  "mass-spec",
  "spatial-tx",
]

// 指定 ButtonType の default payload を Submission に append する helper
const addDefault = (submission: Submission, buttonType: ButtonType): Submission =>
  submissionReducer(submission, {
    type: "add-file",
    payload: buildDefaultAddFilePayload(submission, buttonType),
  })

describe("nextBaseName", () => {
  it("空 Submission では prefix-001 を返す", () => {
    const s = createEmptySubmission()
    for (const bt of ALL_BUTTONS) {
      expect(nextBaseName(s, bt)).toBe(`${BUTTON_BASE_NAME_PREFIX[bt]}-001`)
    }
  })

  it("同 ButtonType を追加すると連番が増える", () => {
    let s = createEmptySubmission()
    s = addDefault(s, "sequence-read")
    s = addDefault(s, "sequence-read")
    s = addDefault(s, "sequence-read")
    expect(nextBaseName(s, "sequence-read")).toBe("read-004")
  })

  it("他 ButtonType の displayName は連番計算に影響しない", () => {
    let s = createEmptySubmission()
    s = addDefault(s, "assembled")
    s = addDefault(s, "assembled")
    // sequence-read の連番は asm を無視して 001
    expect(nextBaseName(s, "sequence-read")).toBe("read-001")
    // assembled は 003
    expect(nextBaseName(s, "assembled")).toBe("asm-003")
  })

  it("削除しても max+1 で再採番、欠番を埋め直さない", () => {
    let s = createEmptySubmission()
    s = addDefault(s, "assembled") // asm-001
    s = addDefault(s, "assembled") // asm-002
    s = addDefault(s, "assembled") // asm-003
    // asm-002 を削除
    const target = s.fileEntries.find((f) => f.displayName === "asm-002.fasta")
    expect(target).toBeDefined()
    s = submissionReducer(s, {
      type: "remove-file",
      payload: { fileId: target!.id },
    })
    // 削除しても次は max(003)+1 = 004 で再採番、002 は再利用しない
    expect(nextBaseName(s, "assembled")).toBe("asm-004")
  })

  it("3 桁 zero-padded", () => {
    let s = createEmptySubmission()
    for (let i = 0; i < 9; i += 1) s = addDefault(s, "annotation")
    expect(nextBaseName(s, "annotation")).toBe("ann-010")
  })
})

describe("buildDefaultAddFilePayload", () => {
  it("sequence-read は pair-end Group + R1/R2 の 2 members", () => {
    const s = createEmptySubmission()
    const p = buildDefaultAddFilePayload(s, "sequence-read")
    expect(p.buttonType).toBe("sequence-read")
    expect(p.groupType).toBe("pair-end")
    expect(p.members).toHaveLength(2)
    expect(p.members[0]?.displayName).toBe("read-001_R1.fastq.gz")
    expect(p.members[0]?.role).toBe("r1")
    expect(p.members[1]?.displayName).toBe("read-001_R2.fastq.gz")
    expect(p.members[1]?.role).toBe("r2")
    expect(p.chipTags).toEqual([{ axis: "functional-genomics", value: "yes" }])
  })

  it("assembled は WGS chip と functional-genomics=wgs-target を持つ", () => {
    const s = createEmptySubmission()
    const p = buildDefaultAddFilePayload(s, "assembled")
    expect(p.groupType).toBe("single")
    expect(p.members).toEqual([
      { displayName: "asm-001.fasta", role: "single" },
    ])
    expect(p.chipTags).toEqual([
      { axis: "assembly-form", value: "wgs" },
      { axis: "functional-genomics", value: "wgs-target" },
    ])
  })

  it("variation は per-sample / snp-indel / variation-target の 3 chip", () => {
    const s = createEmptySubmission()
    const p = buildDefaultAddFilePayload(s, "variation")
    expect(p.members[0]?.displayName).toBe("var-001.vcf.gz")
    expect(p.members[0]?.role).toBe("vcf")
    expect(p.chipTags).toEqual([
      { axis: "variation-form", value: "per-sample" },
      { axis: "variation-type", value: "snp-indel" },
      { axis: "functional-genomics", value: "variation-target" },
    ])
  })

  it("mass-spec は metaboBankSubmissionType=LC-MS を groupOverrides で持つ", () => {
    const s = createEmptySubmission()
    const p = buildDefaultAddFilePayload(s, "mass-spec")
    expect(p.groupOverrides?.metaboBankSubmissionType).toBe("LC-MS")
    expect(p.chipTags).toContainEqual({
      axis: "mass-spec-domain",
      value: "metabolomics",
    })
  })

  it("expression-matrix は experimentTypeHint=bulk-rnaseq を持つ", () => {
    const s = createEmptySubmission()
    const p = buildDefaultAddFilePayload(s, "expression-matrix")
    expect(p.groupOverrides?.experimentTypeHint).toBe("bulk-rnaseq")
  })

  it("spatial-tx は spatial-platform=visium を持つ", () => {
    const s = createEmptySubmission()
    const p = buildDefaultAddFilePayload(s, "spatial-tx")
    expect(p.chipTags).toContainEqual({
      axis: "spatial-platform",
      value: "visium",
    })
  })

  it("9 種全てが reducer で受理されて 1 Group を生成する", () => {
    let s = createEmptySubmission()
    for (const bt of ALL_BUTTONS) {
      const before = s.fileGroups.length
      s = addDefault(s, bt)
      expect(s.fileGroups.length).toBe(before + 1)
    }
  })

  it("連番は buildDefaultAddFilePayload の連続呼出しでも reducer の最新 state に追従する", () => {
    let s = createEmptySubmission()
    s = addDefault(s, "annotation") // ann-001
    s = addDefault(s, "annotation") // ann-002
    const next = buildDefaultAddFilePayload(s, "annotation")
    expect(next.members[0]?.displayName).toBe("ann-003.gff3")
  })
})
