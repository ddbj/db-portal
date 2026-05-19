// defaultPayload helper test
// SSOT: docs/submit-alt3-modals.md §6.2 (default 構成表)

import { describe, expect, it } from "vitest"

import {
  buildDefaultAddFilePayload,
  BUTTON_BASE_NAME_PREFIX,
  DEFAULT_CHIP_VALUES,
  filterDisplayChips,
  isDefaultChip,
  isSingleRowGroup,
  nextBaseName,
  SINGLE_ROW_GROUP_TYPES,
} from "@/lib/submit-alt3/defaultPayload"
import { submissionReducer } from "@/lib/submit-alt3/reducer"
import {
  type ButtonType,
  type ChipTag,
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

describe("DEFAULT_CHIP_VALUES と filterDisplayChips", () => {
  it("buildDefaultAddFilePayload の chipTags は全て DEFAULT_CHIP_VALUES に一致", () => {
    // 「default で生成した chip は全部隠れる」ことが整合性の最低条件
    const s = createEmptySubmission()
    for (const bt of ALL_BUTTONS) {
      const payload = buildDefaultAddFilePayload(s, bt)
      for (const chip of payload.chipTags ?? []) {
        expect(isDefaultChip(bt, chip)).toBe(true)
      }
      // 言い換え: default 構成の chip は全てフィルタで消える
      expect(filterDisplayChips(bt, payload.chipTags ?? [])).toEqual([])
    }
  })

  it("assembled で assembly-form=mag は表示される (default wgs ではない)", () => {
    const chips: ChipTag[] = [
      { axis: "assembly-form", value: "mag" },
      { axis: "functional-genomics", value: "metagenome-target" },
    ]
    const filtered = filterDisplayChips("assembled", chips)
    expect(filtered).toHaveLength(2) // どちらも default ではない
    expect(filtered).toEqual(chips)
  })

  it("assembled で assembly-form=wgs + provenance=third-party は third-party のみ表示", () => {
    const chips: ChipTag[] = [
      { axis: "assembly-form", value: "wgs" }, // default = 隠す
      { axis: "functional-genomics", value: "wgs-target" }, // default = 隠す
      { axis: "provenance", value: "third-party" }, // default なし = 表示
    ]
    const filtered = filterDisplayChips("assembled", chips)
    expect(filtered).toEqual([{ axis: "provenance", value: "third-party" }])
  })

  it("variation で aggregate + sv に変えると 2 chip 表示 (functional-genomics は default のまま隠す)", () => {
    const chips: ChipTag[] = [
      { axis: "variation-form", value: "aggregate" },
      { axis: "variation-type", value: "sv" },
      { axis: "functional-genomics", value: "variation-target" }, // default
    ]
    const filtered = filterDisplayChips("variation", chips)
    expect(filtered).toEqual([
      { axis: "variation-form", value: "aggregate" },
      { axis: "variation-type", value: "sv" },
    ])
  })

  it("sequence-read で Q1=no, Q2=variation-target にすると functional-genomics chip が表示", () => {
    const chips: ChipTag[] = [
      { axis: "functional-genomics", value: "variation-target" },
    ]
    const filtered = filterDisplayChips("sequence-read", chips)
    expect(filtered).toEqual(chips)
  })

  it("spatial-tx で platform=visium (default) は隠し、xenium に変えると表示", () => {
    const visium: ChipTag[] = [
      { axis: "functional-genomics", value: "yes" },
      { axis: "spatial-platform", value: "visium" },
    ]
    expect(filterDisplayChips("spatial-tx", visium)).toEqual([])

    const xenium: ChipTag[] = [
      { axis: "functional-genomics", value: "yes" },
      { axis: "spatial-platform", value: "xenium" },
    ]
    expect(filterDisplayChips("spatial-tx", xenium)).toEqual([
      { axis: "spatial-platform", value: "xenium" },
    ])
  })

  it("空 chipTags は空配列を返す", () => {
    expect(filterDisplayChips("assembled", [])).toEqual([])
  })

  it("DEFAULT_CHIP_VALUES が全 ButtonType をカバー", () => {
    for (const bt of ALL_BUTTONS) {
      expect(DEFAULT_CHIP_VALUES[bt]).toBeDefined()
    }
  })

  it("isDefaultChip: 軸が default に無い chip は default ではない", () => {
    // annotation の default は functional-genomics=other のみ。provenance は default に無い
    expect(isDefaultChip("annotation", { axis: "provenance", value: "third-party" })).toBe(false)
  })

  it("isDefaultChip: 軸はあるが値が違う chip は default ではない", () => {
    // assembled の assembly-form default は wgs。mag は非 default
    expect(isDefaultChip("assembled", { axis: "assembly-form", value: "mag" })).toBe(false)
  })
})

describe("isSingleRowGroup / SINGLE_ROW_GROUP_TYPES (クラス A 判定)", () => {
  // SSOT: docs/submit-alt3.md §4.1 (Group のクラス分け)
  it("クラス A 7 種は true を返す", () => {
    for (
      const t of [
        "single",
        "pair-end",
        "10x",
        "pacbio-hdf5",
        "two-color",
        "mage-tab",
        "imaging-ms",
      ] as const
    ) {
      expect(isSingleRowGroup(t)).toBe(true)
    }
  })

  it("クラス B / C は false を返す", () => {
    for (
      const t of [
        "hybrid",
        "multiplex",
        "variation-ref",
        "mag-sag-chain",
        "assembly-annotation",
        "jga-dataset",
      ] as const
    ) {
      expect(isSingleRowGroup(t)).toBe(false)
    }
  })

  it("SINGLE_ROW_GROUP_TYPES と isSingleRowGroup の判定が一致する", () => {
    const allTypes = [
      "single",
      "pair-end",
      "10x",
      "pacbio-hdf5",
      "two-color",
      "hybrid",
      "multiplex",
      "mage-tab",
      "imaging-ms",
      "variation-ref",
      "mag-sag-chain",
      "assembly-annotation",
      "jga-dataset",
    ] as const
    for (const t of allTypes) {
      expect(isSingleRowGroup(t)).toBe(SINGLE_ROW_GROUP_TYPES.includes(t))
    }
  })
})
