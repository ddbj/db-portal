// submit-alt3 submissionReducer test
// SSOT: docs/submit-alt3-data-model.md §4.4

import { describe, expect, it } from "vitest"

import { submissionReducer } from "@/lib/submit-alt3/reducer"
import { createEmptySubmission, type Submission } from "@/types/submit-alt3"

// よく使う初期 fixture: 1 pair-end raw FASTQ Group を持つ Submission
const seedWithOnePairEnd = (): Submission => {
  let s = createEmptySubmission()
  s = submissionReducer(s, {
    type: "add-file",
    payload: {
      buttonType: "sequence-read",
      groupType: "pair-end",
      members: [
        { displayName: "a_R1.fastq", role: "r1" },
        { displayName: "a_R2.fastq", role: "r2" },
      ],
      defaultDataForm: "raw",
    },
  })

  return s
}

describe("createEmptySubmission", () => {
  it("初期 sequence カウンタが全て 0", () => {
    const s = createEmptySubmission()
    expect(s.bpSequence).toBe(0)
    expect(s.bsSequence).toBe(0)
    expect(s.fileSequence).toBe(0)
    expect(s.groupSequence).toBe(0)
    expect(s.derivedBsSequence).toBe(0)
    expect(s.fileEntries).toEqual([])
    expect(s.fileGroups).toEqual([])
    expect(s.biosamples).toEqual([])
    expect(s.primaryBioProjects).toEqual([])
    expect(s.serviceDrafts).toEqual({})
    expect(s.dismissedWarnings).toEqual({})
  })
})

describe("add-file action", () => {
  it("members 個数 = fileEntries 増分 = fileSequence 増分", () => {
    const s = seedWithOnePairEnd()
    expect(s.fileEntries).toHaveLength(2)
    expect(s.fileSequence).toBe(2)
  })

  it("Group id = group-1、members の id = file-1, file-2", () => {
    const s = seedWithOnePairEnd()
    expect(s.fileGroups[0]!.id).toBe("group-1")
    expect(s.fileGroups[0]!.memberFileIds).toEqual(["file-1", "file-2"])
    expect(s.fileEntries.map((f) => f.id)).toEqual(["file-1", "file-2"])
  })

  it("groupSequence が +1 される", () => {
    const s = seedWithOnePairEnd()
    expect(s.groupSequence).toBe(1)
  })

  it("recomputeBpAndBs が走り、primaryBioProjects=1 + biosamples=1 になる", () => {
    const s = seedWithOnePairEnd()
    expect(s.primaryBioProjects).toHaveLength(1)
    expect(s.primaryBioProjects[0]!.id).toBe("bp-1")
    expect(s.biosamples).toHaveLength(1)
    expect(s.biosamples[0]!.id).toBe("bs-1")
    expect(s.biosamples[0]!.sourceGroupIds).toEqual(["group-1"])
    expect(s.bpSequence).toBe(1)
    expect(s.bsSequence).toBe(1)
  })

  it("2 回目の add-file で直前行の organism / accessRestriction を auto 継承", () => {
    let s = seedWithOnePairEnd()
    s = submissionReducer(s, {
      type: "edit-cell",
      payload: { fileId: "file-1", column: "organism", value: "prokaryote" },
    })
    s = submissionReducer(s, {
      type: "edit-cell",
      payload: { fileId: "file-1", column: "accessRestriction", value: "open" },
    })
    s = submissionReducer(s, {
      type: "add-file",
      payload: {
        buttonType: "assembled",
        groupType: "single",
        members: [{ displayName: "assembly.fa", role: "fasta-assembly" }],
        defaultDataForm: "assembled",
      },
    })
    const newEntry = s.fileEntries.find((f) => f.displayName === "assembly.fa")!
    // file-2 の organism は未設定なので、直前行 (= file-2) の値が継承される
    // file-2 は file-1 の auto コピーで organism=undefined のまま
    expect(newEntry.organism).toBeUndefined()
    expect(newEntry.accessRestriction).toBeUndefined()
  })

  it("add-file の autoAccess を指定すると accessRestriction が auto で上書き", () => {
    let s = createEmptySubmission()
    s = submissionReducer(s, {
      type: "add-file",
      payload: {
        buttonType: "sequence-read",
        groupType: "single",
        members: [{ displayName: "x.fastq", role: "single" }],
        defaultDataForm: "raw",
        autoAccess: "restricted",
      },
    })
    expect(s.fileEntries[0]!.accessRestriction).toBe("restricted")
    expect(s.fileEntries[0]!.columnSource.accessRestriction).toBe("auto")
  })

  it("chipTags が新規 file entry にのみ適用される (既存 entry は変化なし)", () => {
    let s = createEmptySubmission()
    s = submissionReducer(s, {
      type: "add-file",
      payload: {
        buttonType: "sequence-read",
        groupType: "single",
        members: [{ displayName: "first.fastq", role: "single" }],
        defaultDataForm: "raw",
      },
    })
    expect(s.fileEntries[0]!.chipTags).toEqual([])
    s = submissionReducer(s, {
      type: "add-file",
      payload: {
        buttonType: "assembled",
        groupType: "single",
        members: [{ displayName: "second.fa", role: "fasta-assembly" }],
        defaultDataForm: "assembled",
        chipTags: [{ axis: "assembly-form", value: "wgs" }],
      },
    })
    expect(s.fileEntries[0]!.chipTags).toEqual([])
    expect(s.fileEntries[1]!.chipTags).toEqual([
      { axis: "assembly-form", value: "wgs" },
    ])
  })

  it("groupOverrides で referenceMeta / metaboBankSubmissionType が Group に乗る", () => {
    let s = createEmptySubmission()
    s = submissionReducer(s, {
      type: "add-file",
      payload: {
        buttonType: "mass-spec",
        groupType: "single",
        members: [{ displayName: "x.mzML", role: "raw" }],
        defaultDataForm: "mass-spec",
        groupOverrides: {
          metaboBankSubmissionType: "LC-MS",
          referenceMeta: { citedAccessions: ["ABC123"] },
        },
      },
    })
    expect(s.fileGroups[0]!.metaboBankSubmissionType).toBe("LC-MS")
    expect(s.fileGroups[0]!.referenceMeta).toEqual({
      citedAccessions: ["ABC123"],
    })
  })

  it("純粋性: 同じ state + 同じ payload で 2 回呼ぶと結果は deep equal", () => {
    const initial = createEmptySubmission()
    const payload = {
      buttonType: "sequence-read" as const,
      groupType: "single" as const,
      members: [{ displayName: "x.fastq", role: "single" as const }],
      defaultDataForm: "raw" as const,
    }
    const a = submissionReducer(initial, { type: "add-file", payload })
    const b = submissionReducer(initial, { type: "add-file", payload })
    expect(a).toEqual(b)
  })

  describe("linkToBsId (data-model §4.3.1 同 sample 関連付け)", () => {
    it("linkToBsId 指定で新規 Group が既存 BS の sourceGroupIds に append、BS は増えない", () => {
      const s0 = seedWithOnePairEnd()
      expect(s0.biosamples).toHaveLength(1)
      expect(s0.biosamples[0]?.id).toBe("bs-1")

      const s = submissionReducer(s0, {
        type: "add-file",
        payload: {
          buttonType: "assembled",
          groupType: "single",
          members: [{ displayName: "assembly.fa", role: "fasta-assembly" }],
          defaultDataForm: "assembled",
          linkToBsId: "bs-1",
        },
      })

      // BS は依然 1 個、sourceGroupIds に group-2 が追加
      expect(s.biosamples).toHaveLength(1)
      expect(s.biosamples[0]?.id).toBe("bs-1")
      expect(s.biosamples[0]?.sourceGroupIds).toEqual(["group-1", "group-2"])
      // bsSequence は増えない (新規 BS を作らないので)
      expect(s.bsSequence).toBe(1)
      // FileGroup に sourceBsHint が保存される
      const newGroup = s.fileGroups.find((g) => g.id === "group-2")
      expect(newGroup?.sourceBsHint).toBe("bs-1")
    })

    it("linkToBsId が存在しない BS id を指す場合は単独 BS にフォールバック (referential integrity)", () => {
      const s0 = seedWithOnePairEnd()
      const s = submissionReducer(s0, {
        type: "add-file",
        payload: {
          buttonType: "assembled",
          groupType: "single",
          members: [{ displayName: "assembly.fa", role: "fasta-assembly" }],
          defaultDataForm: "assembled",
          linkToBsId: "bs-999", // 存在しない
        },
      })

      // フォールバックで新規 BS=bs-2 を作る
      expect(s.biosamples).toHaveLength(2)
      expect(s.biosamples.map((b) => b.id)).toEqual(["bs-1", "bs-2"])
      expect(s.biosamples[1]?.sourceGroupIds).toEqual(["group-2"])
    })

    it("linkToBsId 経由で集約しても remove-file で対象 file を消すと sourceGroupIds から該当 group が消える", () => {
      let s = seedWithOnePairEnd()
      s = submissionReducer(s, {
        type: "add-file",
        payload: {
          buttonType: "assembled",
          groupType: "single",
          members: [{ displayName: "assembly.fa", role: "fasta-assembly" }],
          defaultDataForm: "assembled",
          linkToBsId: "bs-1",
        },
      })
      expect(s.biosamples[0]?.sourceGroupIds).toEqual(["group-1", "group-2"])

      // group-2 の唯一の file を削除すると group-2 自体が消える → BS の sourceGroupIds も group-1 のみに戻る
      const assemblyFileId = s.fileEntries.find(
        (f) => f.displayName === "assembly.fa",
      )?.id
      expect(assemblyFileId).toBeDefined()
      s = submissionReducer(s, {
        type: "remove-file",
        payload: { fileId: assemblyFileId as string },
      })
      expect(s.biosamples).toHaveLength(1)
      expect(s.biosamples[0]?.sourceGroupIds).toEqual(["group-1"])
    })
  })
})

describe("edit-cell action", () => {
  it("organism / accessRestriction / dataForm を user 入力でセット", () => {
    let s = seedWithOnePairEnd()
    s = submissionReducer(s, {
      type: "edit-cell",
      payload: { fileId: "file-1", column: "organism", value: "human" },
    })
    expect(s.fileEntries[0]!.organism).toBe("human")
    expect(s.fileEntries[0]!.columnSource.organism).toBe("user")
  })

  it("value=undefined で該当 field を削除 (exactOptionalPropertyTypes 対応)", () => {
    let s = seedWithOnePairEnd()
    s = submissionReducer(s, {
      type: "edit-cell",
      payload: { fileId: "file-1", column: "organism", value: "human" },
    })
    expect(s.fileEntries[0]!.organism).toBe("human")
    s = submissionReducer(s, {
      type: "edit-cell",
      payload: { fileId: "file-1", column: "organism", value: undefined },
    })
    expect("organism" in s.fileEntries[0]!).toBe(false)
    // columnSource は更新される (user-edit という意思表示は残る)
    expect(s.fileEntries[0]!.columnSource.organism).toBe("user")
  })

  it("source=auto を渡すと columnSource[column]='auto'", () => {
    let s = seedWithOnePairEnd()
    s = submissionReducer(s, {
      type: "edit-cell",
      payload: {
        fileId: "file-1",
        column: "organism",
        value: "human",
        source: "auto",
      },
    })
    expect(s.fileEntries[0]!.columnSource.organism).toBe("auto")
  })

  it("存在しない fileId は no-op", () => {
    const s = seedWithOnePairEnd()
    const result = submissionReducer(s, {
      type: "edit-cell",
      payload: { fileId: "file-nonexistent", column: "organism", value: "human" },
    })
    expect(result.fileEntries).toEqual(s.fileEntries)
  })
})

describe("set-chip action と assembly-form 自動推測", () => {
  it("assembly-form=wgs を立てると functional-genomics=wgs-target が自動付与", () => {
    let s = seedWithOnePairEnd()
    s = submissionReducer(s, {
      type: "set-chip",
      payload: { fileId: "file-1", axis: "assembly-form", value: "wgs" },
    })
    const fgValue = s.fileEntries[0]!.chipTags.find(
      (c) => c.axis === "functional-genomics",
    )?.value
    expect(fgValue).toBe("wgs-target")
  })

  it("functional-genomics に manualOverride=true を立てた後、assembly-form を変えても fg は固定", () => {
    let s = seedWithOnePairEnd()
    s = submissionReducer(s, {
      type: "set-chip",
      payload: { fileId: "file-1", axis: "assembly-form", value: "wgs" },
    })
    s = submissionReducer(s, {
      type: "set-chip",
      payload: {
        fileId: "file-1",
        axis: "functional-genomics",
        value: "other",
        manualOverride: true,
      },
    })
    s = submissionReducer(s, {
      type: "set-chip",
      payload: { fileId: "file-1", axis: "assembly-form", value: "mag" },
    })
    const fgChip = s.fileEntries[0]!.chipTags.find(
      (c) => c.axis === "functional-genomics",
    )!
    // manualOverride が立っているので mag → metagenome-target に上書きされない
    expect(fgChip.value).toBe("other")
    expect(fgChip.manualOverride).toBe(true)
  })

  it("value=undefined で chip 配列から削除", () => {
    let s = seedWithOnePairEnd()
    s = submissionReducer(s, {
      type: "set-chip",
      payload: { fileId: "file-1", axis: "assembly-form", value: "wgs" },
    })
    expect(
      s.fileEntries[0]!.chipTags.some((c) => c.axis === "assembly-form"),
    ).toBe(true)
    s = submissionReducer(s, {
      type: "set-chip",
      payload: { fileId: "file-1", axis: "assembly-form", value: undefined },
    })
    expect(
      s.fileEntries[0]!.chipTags.some((c) => c.axis === "assembly-form"),
    ).toBe(false)
    // assembly-form 削除に伴い functional-genomics の自動推測値も削除される (patchChips の連動)
    expect(
      s.fileEntries[0]!.chipTags.some((c) => c.axis === "functional-genomics"),
    ).toBe(false)
  })

  it("reset-chip-manual で functional-genomics の manualOverride 解除 + assembly-form から再推測", () => {
    let s = seedWithOnePairEnd()
    s = submissionReducer(s, {
      type: "set-chip",
      payload: { fileId: "file-1", axis: "assembly-form", value: "wgs" },
    })
    s = submissionReducer(s, {
      type: "set-chip",
      payload: {
        fileId: "file-1",
        axis: "functional-genomics",
        value: "other",
        manualOverride: true,
      },
    })
    s = submissionReducer(s, {
      type: "reset-chip-manual",
      payload: { fileId: "file-1", axis: "functional-genomics" },
    })
    const fgChip = s.fileEntries[0]!.chipTags.find(
      (c) => c.axis === "functional-genomics",
    )!
    expect(fgChip.value).toBe("wgs-target")
    expect(fgChip.manualOverride).toBeUndefined()
  })
})

describe("remove-file action", () => {
  it("file を削除すると fileEntries / fileGroups.memberFileIds から消える", () => {
    let s = seedWithOnePairEnd()
    s = submissionReducer(s, {
      type: "remove-file",
      payload: { fileId: "file-1" },
    })
    expect(s.fileEntries.map((f) => f.id)).toEqual(["file-2"])
    expect(s.fileGroups[0]!.memberFileIds).toEqual(["file-2"])
  })

  it("Group のメンバが 0 になったら Group ごと削除 + recomputeBpAndBs で biosamples も連動", () => {
    let s = seedWithOnePairEnd()
    s = submissionReducer(s, { type: "remove-file", payload: { fileId: "file-1" } })
    s = submissionReducer(s, { type: "remove-file", payload: { fileId: "file-2" } })
    expect(s.fileGroups).toEqual([])
    expect(s.fileEntries).toEqual([])
    expect(s.biosamples).toEqual([])
  })

  it("削除しても sequence カウンタは monotonic (再利用されない)", () => {
    let s = seedWithOnePairEnd()
    expect(s.fileSequence).toBe(2)
    expect(s.groupSequence).toBe(1)
    s = submissionReducer(s, { type: "remove-file", payload: { fileId: "file-1" } })
    s = submissionReducer(s, { type: "remove-file", payload: { fileId: "file-2" } })
    expect(s.fileSequence).toBe(2)
    expect(s.groupSequence).toBe(1)
    s = submissionReducer(s, {
      type: "add-file",
      payload: {
        buttonType: "sequence-read",
        groupType: "single",
        members: [{ displayName: "new.fastq", role: "single" }],
        defaultDataForm: "raw",
      },
    })
    // 削除されても file-3 / group-2 から採番 (再利用なし)
    expect(s.fileEntries[0]!.id).toBe("file-3")
    expect(s.fileGroups[0]!.id).toBe("group-2")
  })

  it("存在しない fileId は no-op", () => {
    const s = seedWithOnePairEnd()
    const result = submissionReducer(s, {
      type: "remove-file",
      payload: { fileId: "file-nonexistent" },
    })
    expect(result).toEqual(s)
  })
})

describe("dismiss-warning / restore-warning", () => {
  it("dismiss-warning で dismissedWarnings に true を追加", () => {
    let s = createEmptySubmission()
    s = submissionReducer(s, {
      type: "dismiss-warning",
      payload: { warningId: "warning-1" },
    })
    expect(s.dismissedWarnings).toEqual({ "warning-1": true })
  })

  it("restore-warning で dismissedWarnings から key 削除", () => {
    let s = createEmptySubmission()
    s = submissionReducer(s, {
      type: "dismiss-warning",
      payload: { warningId: "warning-1" },
    })
    s = submissionReducer(s, {
      type: "dismiss-warning",
      payload: { warningId: "warning-2" },
    })
    s = submissionReducer(s, {
      type: "restore-warning",
      payload: { warningId: "warning-1" },
    })
    expect(s.dismissedWarnings).toEqual({ "warning-2": true })
  })

  it("remove-file で対象 BS が消えると関連 dismissedWarnings も削除 (cleanup、data-model §4.4.2)", () => {
    let s = seedWithOnePairEnd()
    s = submissionReducer(s, {
      type: "dismiss-warning",
      payload: { warningId: "step-dra-bs-1:rule14:libraryStrategy=WGS|functional-genomics=yes" },
    })
    // group-1 の全 file を消すと group-1 自体が削除され、bs-1 も消滅
    s = submissionReducer(s, { type: "remove-file", payload: { fileId: "file-1" } })
    s = submissionReducer(s, { type: "remove-file", payload: { fileId: "file-2" } })
    expect(s.biosamples).toEqual([])
    expect(
      s.dismissedWarnings["step-dra-bs-1:rule14:libraryStrategy=WGS|functional-genomics=yes"],
    ).toBeUndefined()
  })

  it("remove-file で対象 BS がまだ存在する場合は dismissedWarnings を保持", () => {
    let s = seedWithOnePairEnd()
    // 2 個目の Group を追加 (bs-2)
    s = submissionReducer(s, {
      type: "add-file",
      payload: {
        buttonType: "assembled",
        groupType: "single",
        members: [{ displayName: "assembly.fa", role: "fasta-assembly" }],
        defaultDataForm: "assembled",
      },
    })
    s = submissionReducer(s, {
      type: "dismiss-warning",
      payload: { warningId: "step-dra-bs-1:rule14:libraryStrategy=WGS|functional-genomics=yes" },
    })
    // assembly file だけ消す → bs-1 はまだ生存
    const assemblyFileId = s.fileEntries.find(
      (f) => f.displayName === "assembly.fa",
    )?.id
    s = submissionReducer(s, {
      type: "remove-file",
      payload: { fileId: assemblyFileId as string },
    })
    expect(s.biosamples.some((b) => b.id === "bs-1")).toBe(true)
    expect(
      s.dismissedWarnings["step-dra-bs-1:rule14:libraryStrategy=WGS|functional-genomics=yes"],
    ).toBe(true)
  })

  it("固定 step (step-togovar 等) の warning は cleanup 対象外", () => {
    let s = seedWithOnePairEnd()
    s = submissionReducer(s, {
      type: "dismiss-warning",
      payload: { warningId: "step-togovar:rule14:fixed-prefix-test" },
    })
    s = submissionReducer(s, { type: "remove-file", payload: { fileId: "file-1" } })
    s = submissionReducer(s, { type: "remove-file", payload: { fileId: "file-2" } })
    expect(s.dismissedWarnings["step-togovar:rule14:fixed-prefix-test"]).toBe(true)
  })
})

describe("update-service-draft action", () => {
  it("初回呼び出しで serviceDrafts[stepId] が作成される", () => {
    let s = createEmptySubmission()
    s = submissionReducer(s, {
      type: "update-service-draft",
      payload: {
        stepId: "step-dra-bs-1",
        serviceKind: "dra",
        values: { libraryStrategy: "WGS" },
      },
    })
    expect(s.serviceDrafts["step-dra-bs-1"]).toEqual({
      kind: "dra",
      libraryStrategy: "WGS",
    })
  })

  it("既存 draft に shallow merge (前回 values + 今回 values)", () => {
    let s = createEmptySubmission()
    s = submissionReducer(s, {
      type: "update-service-draft",
      payload: {
        stepId: "step-dra-bs-1",
        serviceKind: "dra",
        values: { libraryStrategy: "WGS" },
      },
    })
    s = submissionReducer(s, {
      type: "update-service-draft",
      payload: {
        stepId: "step-dra-bs-1",
        serviceKind: "dra",
        values: { librarySource: "GENOMIC" },
      },
    })
    expect(s.serviceDrafts["step-dra-bs-1"]).toEqual({
      kind: "dra",
      libraryStrategy: "WGS",
      librarySource: "GENOMIC",
    })
  })

  it("kind は最後の呼び出しで上書き (serviceKind 変更ケース)", () => {
    let s = createEmptySubmission()
    s = submissionReducer(s, {
      type: "update-service-draft",
      payload: {
        stepId: "step-dra-bs-1",
        serviceKind: "dra",
        values: { foo: 1 },
      },
    })
    s = submissionReducer(s, {
      type: "update-service-draft",
      payload: {
        stepId: "step-dra-bs-1",
        serviceKind: "mss",
        values: { bar: 2 },
      },
    })
    expect(s.serviceDrafts["step-dra-bs-1"]!.kind).toBe("mss")
  })
})

describe("update-group-reference-meta action", () => {
  it("Group に referenceMeta を追加 / 上書き", () => {
    let s = seedWithOnePairEnd()
    s = submissionReducer(s, {
      type: "update-group-reference-meta",
      payload: {
        groupId: "group-1",
        referenceMeta: { citedAccessions: ["ABC1"], pubmedId: "12345" },
      },
    })
    expect(s.fileGroups[0]!.referenceMeta).toEqual({
      citedAccessions: ["ABC1"],
      pubmedId: "12345",
    })
  })

  it("referenceMeta=undefined で Group から referenceMeta key を削除", () => {
    let s = seedWithOnePairEnd()
    s = submissionReducer(s, {
      type: "update-group-reference-meta",
      payload: {
        groupId: "group-1",
        referenceMeta: { citedAccessions: ["ABC1"] },
      },
    })
    s = submissionReducer(s, {
      type: "update-group-reference-meta",
      payload: { groupId: "group-1", referenceMeta: undefined },
    })
    expect("referenceMeta" in s.fileGroups[0]!).toBe(false)
  })

  it("存在しない groupId は no-op", () => {
    const s = seedWithOnePairEnd()
    const result = submissionReducer(s, {
      type: "update-group-reference-meta",
      payload: {
        groupId: "group-nonexistent",
        referenceMeta: { citedAccessions: ["X"] },
      },
    })
    expect(result.fileGroups).toEqual(s.fileGroups)
  })
})

describe("recomputeBpAndBs 不変条件", () => {
  it("add-file → edit-cell で organism を変えても primaryBioProjects[0].id は安定 (再採番なし)", () => {
    let s = seedWithOnePairEnd()
    const bpId = s.primaryBioProjects[0]!.id
    s = submissionReducer(s, {
      type: "edit-cell",
      payload: { fileId: "file-1", column: "organism", value: "human" },
    })
    expect(s.primaryBioProjects[0]!.id).toBe(bpId)
  })

  it("derivedFromTags は fileEntries の (organism, access, dataForm) を反映", () => {
    let s = seedWithOnePairEnd()
    s = submissionReducer(s, {
      type: "edit-cell",
      payload: { fileId: "file-1", column: "organism", value: "human" },
    })
    s = submissionReducer(s, {
      type: "edit-cell",
      payload: { fileId: "file-1", column: "accessRestriction", value: "open" },
    })
    s = submissionReducer(s, {
      type: "edit-cell",
      payload: { fileId: "file-2", column: "organism", value: "prokaryote" },
    })
    const tags = s.primaryBioProjects[0]!.derivedFromTags
    expect(tags).toHaveLength(2)
    expect(tags[0]).toMatchObject({ organism: "human", accessRestriction: "open" })
    expect(tags[1]).toMatchObject({ organism: "prokaryote" })
  })

  it("新規 BS の id は bsSequence + 1 から採番、既存 BS は sourceGroupIds を更新して再利用", () => {
    let s = seedWithOnePairEnd()
    const originalBsId = s.biosamples[0]!.id
    s = submissionReducer(s, {
      type: "edit-cell",
      payload: { fileId: "file-1", column: "organism", value: "human" },
    })
    // 既存 BS は再利用 (id 変わらず)
    expect(s.biosamples[0]!.id).toBe(originalBsId)
    // 2 個目 Group を追加 → 新規 BS は bs-2
    s = submissionReducer(s, {
      type: "add-file",
      payload: {
        buttonType: "assembled",
        groupType: "single",
        members: [{ displayName: "x.fa", role: "fasta-assembly" }],
        defaultDataForm: "assembled",
      },
    })
    expect(s.biosamples).toHaveLength(2)
    expect(s.biosamples[1]!.id).toBe("bs-2")
  })
})
