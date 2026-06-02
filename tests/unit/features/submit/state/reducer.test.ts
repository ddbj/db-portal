import { describe, expect, test } from "vitest"

import { initialState, submitReducer } from "../../../../../app/features/submit/state/reducer"
import type { UIState } from "../../../../../app/features/submit/state/types"
import type { FileEntry } from "../../../../../app/schemas/submit"
import {
  FileTypeKind,
  TYPICAL_DATA_FORM_FOR_KIND,
  TYPICAL_GROUP_TYPE_FOR_KIND,
} from "../../../../../app/schemas/submit"

const addRow = (
  state: UIState,
  fileTypeKind: FileEntry["fileTypeKind"],
  entryId: string,
  groupId: string,
): UIState =>
  submitReducer(state, { type: "ADD_ROW", fileTypeKind, entryId, groupId })

const withPreconditions = (
  q1: "public" | "restricted" | "third-party",
  q2: "human" | "eukaryote" | "prokaryote" | "virus" | "metagenome" | null,
): UIState => {
  let state = submitReducer(initialState, { type: "SET_Q1", q1 })
  if (q2 !== null) state = submitReducer(state, { type: "SET_Q2", q2 })

  return state
}

describe("submitReducer preconditions", () => {
  test("submitReducer_setQ1_updatesPreconditionQ1", () => {
    const next = submitReducer(initialState, { type: "SET_Q1", q1: "public" })
    expect(next.submission.preconditions.q1).toBe("public")
    expect(next.submission.preconditions.q2).toBeNull()
  })

  test("submitReducer_setQ2_updatesPreconditionQ2WithoutTouchingQ1", () => {
    const next = submitReducer(initialState, { type: "SET_Q2", q2: "human" })
    expect(next.submission.preconditions.q2).toBe("human")
    expect(next.submission.preconditions.q1).toBe(initialState.submission.preconditions.q1)
  })

  test("submitReducer_setQ1Null_clearsQ1WithoutTouchingQ2", () => {
    const seeded = withPreconditions("public", "human")
    const next = submitReducer(seeded, { type: "SET_Q1", q1: null })
    expect(next.submission.preconditions.q1).toBeNull()
    // q1=null では絞り込み材料が無いので enable のまま、human は維持される
    expect(next.submission.preconditions.q2).toBe("human")
  })

  test("submitReducer_setQ1Restricted_keepsNonHumanQ2Enabled", () => {
    // 公開+制限 の repos は公開系 ∪ JGA = 全 destination なので、非ヒト Q2 も enable のまま維持される
    const seeded = withPreconditions("public", "eukaryote")
    const next = submitReducer(seeded, { type: "SET_Q1", q1: "restricted" })
    expect(next.submission.preconditions.q1).toBe("restricted")
    expect(next.submission.preconditions.q2).toBe("eukaryote")
  })

  test("submitReducer_setQ1ThirdParty_dropsNowDisabledQ2", () => {
    // 第三者 (repos = ddbj-trad / metabobank) は全 Q2 が依然 intersect するため disable されない
    const seeded = withPreconditions("public", "human")
    const next = submitReducer(seeded, { type: "SET_Q1", q1: "third-party" })
    expect(next.submission.preconditions.q2).toBe("human")
  })

  test("submitReducer_changingQ1_recomputesEntryAccessDefaults", () => {
    // restricted + human で reads を追加すると restricted、public に変えると open に追従する
    let state = withPreconditions("restricted", "human")
    state = addRow(state, "sequence-read", "e1", "g1")
    expect(state.submission.fileEntries[0]!.access).toBe("restricted")
    const next = submitReducer(state, { type: "SET_Q1", q1: "public" })
    expect(next.submission.fileEntries[0]!.access).toBe("open")
  })
})

describe("submitReducer ADD_ROW", () => {
  test("submitReducer_addRow_addsOneEntryAndGroup", () => {
    const next = addRow(initialState, "sequence-read", "e1", "g1")
    expect(next.submission.fileEntries).toHaveLength(1)
    expect(next.submission.fileGroups).toHaveLength(1)
    expect(next.submission.fileGroups[0]!.id).toBe("g1")
    expect(next.submission.fileGroups[0]!.memberFileIds).toEqual(["e1"])
    expect(next.submission.fileEntries[0]!.id).toBe("e1")
    expect(next.submission.fileEntries[0]!.groupId).toBe("g1")
  })

  test("submitReducer_addRow_injectsTypicalDataFormAndGroupTypePerKind", () => {
    for (const kind of FileTypeKind.options) {
      const next = addRow(initialState, kind, "e1", "g1")
      const entry = next.submission.fileEntries[0]!
      const group = next.submission.fileGroups[0]!
      expect(entry.fileTypeKind).toBe(kind)
      expect(entry.dataForm).toBe(TYPICAL_DATA_FORM_FOR_KIND[kind])
      expect(group.groupType).toBe(TYPICAL_GROUP_TYPE_FOR_KIND[kind])
    }
  })

  test("submitReducer_addRowWithPublicQ1_injectsOpenAccess", () => {
    const next = addRow(withPreconditions("public", "human"), "sequence-read", "e1", "g1")
    expect(next.submission.fileEntries[0]!.access).toBe("open")
  })

  test("submitReducer_addRowWithThirdPartyQ1_injectsOpenAccess", () => {
    const next = addRow(withPreconditions("third-party", null), "sequence-nucleotide", "e1", "g1")
    expect(next.submission.fileEntries[0]!.access).toBe("open")
  })

  test("submitReducer_addRowRestrictedHumanSensitiveKind_injectsRestrictedAccess", () => {
    const next = addRow(withPreconditions("restricted", "human"), "sequence-read", "e1", "g1")
    expect(next.submission.fileEntries[0]!.access).toBe("restricted")
  })

  test("submitReducer_addRowRestrictedHumanNonSensitiveKind_injectsOpenAccess", () => {
    // expression-matrix は access で登録先が変わらないため公開+制限でも open default
    const next = addRow(withPreconditions("restricted", "human"), "expression-matrix", "e1", "g1")
    expect(next.submission.fileEntries[0]!.access).toBe("open")
  })

  test("submitReducer_addRowRestrictedNonHumanReads_injectsOpenAccess", () => {
    // 非ヒトは JGA 対象外。reads の制限公開は embargo の opt-in なので default は open
    const next = addRow(withPreconditions("restricted", "prokaryote"), "sequence-read", "e1", "g1")
    expect(next.submission.fileEntries[0]!.access).toBe("open")
  })
})

describe("submitReducer assembly-annotation auto-pairing", () => {
  // 配列 (FASTA) とアノテーションを選び、アノテーションで「配列ペア」を commit する
  const pairAnnotation = (state: UIState): UIState =>
    submitReducer(state, {
      type: "COMMIT_ROW_EDIT",
      entryId: "ann",
      patch: { groupType: "assembly-annotation", dataForm: "annotation", chipTags: [] },
      releasedGroupId: "rel-a",
    })

  test("submitReducer_commitAssemblyPairWithFastaPresent_autoPairsTheSingleFasta", () => {
    let state = addRow(initialState, "sequence-nucleotide", "fa", "g-fa")
    state = addRow(state, "sequence-annotation", "ann", "g-ann")
    const next = pairAnnotation(state)
    const annGroup = next.submission.fileGroups.find((g) => g.id === "g-ann")!
    expect(annGroup.groupType).toBe("assembly-annotation")
    expect(new Set(annGroup.memberFileIds)).toEqual(new Set(["ann", "fa"]))
    expect(next.submission.fileEntries.find((e) => e.id === "fa")!.groupId).toBe("g-ann")
    // 相方の元 group は空になり drop される
    expect(next.submission.fileGroups.some((g) => g.id === "g-fa")).toBe(false)
  })

  test("submitReducer_addFastaAfterPairSelected_joinsWaitingAnnotationGroup", () => {
    // 先にアノテーションでペアを選び (相方未定)、後から FASTA を追加すると待機 group に取り込む
    let state = addRow(initialState, "sequence-annotation", "ann", "g-ann")
    state = pairAnnotation(state)
    expect(state.submission.fileGroups.find((g) => g.id === "g-ann")!.memberFileIds).toEqual(["ann"])
    state = addRow(state, "sequence-nucleotide", "fa", "g-fa")
    const annGroup = state.submission.fileGroups.find((g) => g.id === "g-ann")!
    expect(new Set(annGroup.memberFileIds)).toEqual(new Set(["ann", "fa"]))
    expect(state.submission.fileEntries.find((e) => e.id === "fa")!.groupId).toBe("g-ann")
  })

  test("submitReducer_commitStandaloneAfterPairing_dissolvesPairAndRestoresPartner", () => {
    let state = addRow(initialState, "sequence-nucleotide", "fa", "g-fa")
    state = addRow(state, "sequence-annotation", "ann", "g-ann")
    state = pairAnnotation(state)
    // 単独アノテーション (groupType single) に戻すとペアは解消し、相方は単独 group に戻る
    const next = submitReducer(state, {
      type: "COMMIT_ROW_EDIT",
      entryId: "ann",
      patch: { groupType: "single", dataForm: "annotation", chipTags: [] },
      releasedGroupId: "rel-c",
    })
    expect(next.submission.fileGroups.find((g) => g.id === "g-ann")!.groupType).toBe("single")
    const faEntry = next.submission.fileEntries.find((e) => e.id === "fa")!
    expect(faEntry.groupId).not.toBe("g-ann")
    const faGroup = next.submission.fileGroups.find((g) => g.id === faEntry.groupId)!
    expect(faGroup.groupType).toBe("single")
    expect(faGroup.memberFileIds).toEqual(["fa"])
  })

  test("submitReducer_removePairedFasta_keepsAnnotationAndRestoresSingle", () => {
    let state = addRow(initialState, "sequence-nucleotide", "fa", "g-fa")
    state = addRow(state, "sequence-annotation", "ann", "g-ann")
    state = pairAnnotation(state)
    const next = submitReducer(state, { type: "REMOVE_ROW", entryId: "fa" })
    expect(next.submission.fileEntries.map((e) => e.id)).toEqual(["ann"])
    const annGroup = next.submission.fileGroups.find((g) => g.id === "g-ann")!
    expect(annGroup.memberFileIds).toEqual(["ann"])
    expect(annGroup.groupType).toBe("single")
  })
})

describe("submitReducer EDIT_ROW_CELL", () => {
  test("submitReducer_editRowCell_cannotOverrideIdFileTypeKindOrGroupId", () => {
    const seeded = addRow(initialState, "sequence-read", "e1", "g1")
    const next = submitReducer(seeded, {
      type: "EDIT_ROW_CELL",
      entryId: "e1",
      patch: {
        id: "hijacked",
        fileTypeKind: "variant",
        groupId: "g-hijack",
        access: "restricted",
        dataForm: "assembled",
        chipTags: [{ axis: "mass-spec-domain", value: "proteomics" }],
      },
    })
    const entry = next.submission.fileEntries[0]!
    expect(entry.id).toBe("e1")
    expect(entry.fileTypeKind).toBe("sequence-read")
    expect(entry.groupId).toBe("g1")
    // 上書き可能なフィールドは反映される
    expect(entry.access).toBe("restricted")
    expect(entry.dataForm).toBe("assembled")
    expect(entry.chipTags).toEqual([{ axis: "mass-spec-domain", value: "proteomics" }])
  })

  test("submitReducer_editRowCellUnknownEntry_leavesEntriesUntouched", () => {
    const seeded = addRow(initialState, "sequence-read", "e1", "g1")
    const next = submitReducer(seeded, {
      type: "EDIT_ROW_CELL",
      entryId: "ghost",
      patch: { access: "restricted" },
    })
    expect(next.submission.fileEntries).toHaveLength(1)
    expect(next.submission.fileEntries[0]!.access).toBe("open")
  })

  test("submitReducer_editRowCellAccessOnly_updatesAccess", () => {
    const seeded = addRow(initialState, "sequence-read", "e1", "g1")
    const next = submitReducer(seeded, {
      type: "EDIT_ROW_CELL",
      entryId: "e1",
      patch: { access: "restricted" },
    })
    expect(next.submission.fileEntries[0]!.access).toBe("restricted")
  })
})

describe("submitReducer REMOVE_ROW", () => {
  test("submitReducer_removeRow_dropsEntryAndEmptiedGroup", () => {
    const seeded = addRow(initialState, "sequence-read", "e1", "g1")
    const next = submitReducer(seeded, { type: "REMOVE_ROW", entryId: "e1" })
    expect(next.submission.fileEntries).toHaveLength(0)
    expect(next.submission.fileGroups).toHaveLength(0)
  })

  test("submitReducer_removeRow_keepsOtherGroupsIntact", () => {
    let state = addRow(initialState, "sequence-read", "e1", "g1")
    state = addRow(state, "variant", "e2", "g2")
    const next = submitReducer(state, { type: "REMOVE_ROW", entryId: "e1" })
    expect(next.submission.fileGroups.map((g) => g.id)).toEqual(["g2"])
    expect(next.submission.fileEntries.map((e) => e.id)).toEqual(["e2"])
  })

  test("submitReducer_removeRowUnknownEntry_dropsNoEntriesButGroupsSurvive", () => {
    const seeded = addRow(initialState, "sequence-read", "e1", "g1")
    const next = submitReducer(seeded, { type: "REMOVE_ROW", entryId: "ghost" })
    expect(next.submission.fileEntries).toHaveLength(1)
    expect(next.submission.fileGroups).toHaveLength(1)
    expect(next.submission.fileGroups[0]!.memberFileIds).toEqual(["e1"])
  })
})

describe("submitReducer COMMIT_ROW_EDIT", () => {
  test("submitReducer_commitRowEdit_appliesGroupTypeDataFormAndChips", () => {
    const seeded = addRow(initialState, "sequence-read", "e1", "g1")
    const next = submitReducer(seeded, {
      type: "COMMIT_ROW_EDIT",
      entryId: "e1",
      patch: {
        groupType: "pair-end",
        dataForm: "assembled",
        chipTags: [{ axis: "assembly-form", value: "primary" }],
      },
      releasedGroupId: "rel",
    })
    expect(next.submission.fileGroups[0]!.groupType).toBe("pair-end")
    expect(next.submission.fileEntries[0]!.dataForm).toBe("assembled")
    expect(next.submission.fileEntries[0]!.chipTags).toEqual([
      { axis: "assembly-form", value: "primary" },
    ])
  })

  test("submitReducer_commitRowEditUnknownEntry_returnsStateUnchanged", () => {
    const seeded = addRow(initialState, "sequence-read", "e1", "g1")
    const next = submitReducer(seeded, {
      type: "COMMIT_ROW_EDIT",
      entryId: "ghost",
      patch: { dataForm: "assembled" },
      releasedGroupId: "rel",
    })
    expect(next).toBe(seeded)
  })
})

describe("submitReducer immutability", () => {
  test("submitReducer_addRow_doesNotMutateInputState", () => {
    const before = initialState
    submitReducer(before, { type: "ADD_ROW", fileTypeKind: "sequence-read", entryId: "e1", groupId: "g1" })
    expect(before.submission.fileEntries).toHaveLength(0)
    expect(before.submission.fileGroups).toHaveLength(0)
  })

  test("submitReducer_removeRow_doesNotMutateInputState", () => {
    const seeded = addRow(initialState, "sequence-read", "e1", "g1")
    const beforeEntries = seeded.submission.fileEntries
    submitReducer(seeded, { type: "REMOVE_ROW", entryId: "e1" })
    expect(beforeEntries).toHaveLength(1)
    expect(seeded.submission.fileGroups[0]!.memberFileIds).toEqual(["e1"])
  })
})
