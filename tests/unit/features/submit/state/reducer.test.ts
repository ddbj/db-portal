import { describe, expect, test } from "vitest"

import {
  defaultFilenameFor,
  initialState,
  submitReducer,
} from "../../../../../app/features/submit/state/reducer"
import type { UIState } from "../../../../../app/features/submit/state/types"
import type { FileEntry } from "../../../../../app/schemas/submit"
import {
  DEFAULT_FILENAME_FOR_KIND,
  FileTypeKind,
  TYPICAL_DATA_FORM_FOR_KIND,
  TYPICAL_GROUP_TYPE_FOR_KIND,
} from "../../../../../app/schemas/submit"

const entryWith = (
  fileTypeKind: FileEntry["fileTypeKind"],
  filename: string,
): FileEntry => ({
  id: `id-${filename || fileTypeKind}`,
  fileTypeKind,
  filename,
  access: "open",
  dataForm: TYPICAL_DATA_FORM_FOR_KIND[fileTypeKind],
  groupId: "g",
  chipTags: [],
})

const addRow = (
  state: UIState,
  fileTypeKind: FileEntry["fileTypeKind"],
  entryId: string,
  groupId: string,
): UIState =>
  submitReducer(state, { type: "ADD_ROW", fileTypeKind, entryId, groupId })

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
    const seeded = submitReducer(
      submitReducer(initialState, { type: "SET_Q1", q1: "public" }),
      { type: "SET_Q2", q2: "human" },
    )
    const next = submitReducer(seeded, { type: "SET_Q1", q1: null })
    expect(next.submission.preconditions.q1).toBeNull()
    // q1=null では絞り込み材料が無いので enable のまま、human は維持される
    expect(next.submission.preconditions.q2).toBe("human")
  })

  test("submitReducer_setQ1Restricted_dropsNowDisabledQ2", () => {
    // public + eukaryote は許容、restricted では eukaryote が disable になるため null 化される
    const seeded = submitReducer(
      submitReducer(initialState, { type: "SET_Q1", q1: "public" }),
      { type: "SET_Q2", q2: "eukaryote" },
    )
    expect(seeded.submission.preconditions.q2).toBe("eukaryote")

    const next = submitReducer(seeded, { type: "SET_Q1", q1: "restricted" })
    expect(next.submission.preconditions.q1).toBe("restricted")
    expect(next.submission.preconditions.q2).toBeNull()
  })

  test("submitReducer_setQ1Restricted_keepsStillEnabledQ2", () => {
    // restricted (JGA) はヒト個人のみ。human だけが引き続き enable なので維持される
    const seeded = submitReducer(
      submitReducer(initialState, { type: "SET_Q1", q1: "public" }),
      { type: "SET_Q2", q2: "human" },
    )
    const next = submitReducer(seeded, { type: "SET_Q1", q1: "restricted" })
    expect(next.submission.preconditions.q2).toBe("human")
  })

  test("submitReducer_setQ1RestrictedWithNullQ2_leavesQ2Null", () => {
    const next = submitReducer(initialState, { type: "SET_Q1", q1: "restricted" })
    expect(next.submission.preconditions.q2).toBeNull()
  })
})

describe("submitReducer ADD_ROW", () => {
  test("submitReducer_addRow_addsOneEntryAndGroupWithoutOpeningModal", () => {
    const next = addRow(initialState, "sequence-read", "e1", "g1")
    expect(next.submission.fileEntries).toHaveLength(1)
    expect(next.submission.fileGroups).toHaveLength(1)
    expect(next.submission.fileGroups[0]!.id).toBe("g1")
    expect(next.submission.fileGroups[0]!.memberFileIds).toEqual(["e1"])
    expect(next.submission.fileEntries[0]!.id).toBe("e1")
    expect(next.submission.fileEntries[0]!.groupId).toBe("g1")
    expect(next.editing).toBeNull()
  })

  test("submitReducer_addRow_injectsTypicalDataFormGroupTypeFilenamePerKind", () => {
    for (const kind of FileTypeKind.options) {
      const next = addRow(initialState, kind, "e1", "g1")
      const entry = next.submission.fileEntries[0]!
      const group = next.submission.fileGroups[0]!
      const { prefix, ext } = DEFAULT_FILENAME_FOR_KIND[kind]
      expect(entry.fileTypeKind).toBe(kind)
      expect(entry.dataForm).toBe(TYPICAL_DATA_FORM_FOR_KIND[kind])
      expect(entry.filename).toBe(`${prefix}-001.${ext}`)
      expect(group.groupType).toBe(TYPICAL_GROUP_TYPE_FOR_KIND[kind])
    }
  })

  test("submitReducer_addRowWithPublicQ1_injectsOpenAccess", () => {
    const seeded = submitReducer(initialState, { type: "SET_Q1", q1: "public" })
    const next = addRow(seeded, "sequence-read", "e1", "g1")
    expect(next.submission.fileEntries[0]!.access).toBe("open")
  })

  test("submitReducer_addRowWithThirdPartyQ1_injectsOpenAccess", () => {
    const seeded = submitReducer(initialState, { type: "SET_Q1", q1: "third-party" })
    const next = addRow(seeded, "sequence-nucleotide", "e1", "g1")
    expect(next.submission.fileEntries[0]!.access).toBe("open")
  })

  test("submitReducer_addRowWithRestrictedQ1_injectsRestrictedAccess", () => {
    const seeded = submitReducer(initialState, { type: "SET_Q1", q1: "restricted" })
    const next = addRow(seeded, "sequence-read", "e1", "g1")
    expect(next.submission.fileEntries[0]!.access).toBe("restricted")
  })

  test("submitReducer_addRowWithNullQ1_defaultsToOpenAccess", () => {
    const seeded = submitReducer(initialState, { type: "SET_Q1", q1: null })
    const next = addRow(seeded, "sequence-read", "e1", "g1")
    expect(next.submission.fileEntries[0]!.access).toBe("open")
  })

  test("submitReducer_addRowSameKind_assignsSequentialSerialFilenames", () => {
    let state = addRow(initialState, "sequence-read", "e1", "g1")
    state = addRow(state, "sequence-read", "e2", "g2")
    state = addRow(state, "sequence-nucleotide", "e3", "g3")
    expect(state.submission.fileEntries.map((e) => e.filename)).toEqual([
      "read-001.fastq",
      "read-002.fastq",
      "seq-001.fasta",
    ])
  })

  test("submitReducer_addRowAfterRemovingMiddleRow_usesMaxPlusOneNoCollision", () => {
    let state = initialState
    state = addRow(state, "sequence-read", "e1", "g1")
    state = addRow(state, "sequence-read", "e2", "g2")
    state = addRow(state, "sequence-read", "e3", "g3")
    state = submitReducer(state, { type: "REMOVE_ROW", entryId: "e2" })
    state = addRow(state, "sequence-read", "e4", "g4")
    expect(state.submission.fileEntries.map((e) => e.filename)).toEqual([
      "read-001.fastq",
      "read-003.fastq",
      "read-004.fastq",
    ])
    // 再追加した行は既存 read-003 と衝突しない
    const filenames = state.submission.fileEntries.map((e) => e.filename)
    expect(new Set(filenames).size).toBe(filenames.length)
  })

  test("submitReducer_addRowAfterRemovingHighestSerial_doesNotReuseGap", () => {
    let state = initialState
    state = addRow(state, "variant", "e1", "g1")
    state = addRow(state, "variant", "e2", "g2")
    state = submitReducer(state, { type: "REMOVE_ROW", entryId: "e2" })
    state = addRow(state, "variant", "e3", "g3")
    // max は 001 のみ残るので次は 002 (削除した 002 番を再利用)
    expect(state.submission.fileEntries.map((e) => e.filename)).toEqual([
      "var-001.vcf",
      "var-002.vcf",
    ])
  })
})

describe("submitReducer ADD_TO_GROUP", () => {
  test("submitReducer_addToGroup_appendsEntryToExistingGroup", () => {
    const seeded = addRow(initialState, "sequence-read", "e1", "g1")
    const next = submitReducer(seeded, {
      type: "ADD_TO_GROUP",
      groupId: "g1",
      fileTypeKind: "sequence-read",
      entryId: "e2",
    })
    expect(next.submission.fileEntries).toHaveLength(2)
    expect(next.submission.fileGroups).toHaveLength(1)
    expect(next.submission.fileGroups[0]!.memberFileIds).toEqual(["e1", "e2"])
    expect(next.submission.fileEntries[1]!.groupId).toBe("g1")
    expect(next.editing).toBeNull()
  })

  test("submitReducer_addToGroupRestrictedQ1_injectsRestrictedAccess", () => {
    const seeded = addRow(
      submitReducer(initialState, { type: "SET_Q1", q1: "restricted" }),
      "sequence-read",
      "e1",
      "g1",
    )
    const next = submitReducer(seeded, {
      type: "ADD_TO_GROUP",
      groupId: "g1",
      fileTypeKind: "sequence-read",
      entryId: "e2",
    })
    expect(next.submission.fileEntries[1]!.access).toBe("restricted")
  })

  test("submitReducer_addToGroupUnknownGroup_returnsStateUnchanged", () => {
    const seeded = addRow(initialState, "sequence-read", "e1", "g1")
    const next = submitReducer(seeded, {
      type: "ADD_TO_GROUP",
      groupId: "does-not-exist",
      fileTypeKind: "sequence-read",
      entryId: "e2",
    })
    expect(next).toBe(seeded)
    expect(next.submission.fileEntries).toHaveLength(1)
  })

  test("submitReducer_addToGroupDuplicateEntryId_doesNotDuplicateMember", () => {
    const seeded = addRow(initialState, "sequence-read", "e1", "g1")
    // 既に memberFileIds に含まれる id を再度入れても二重登録されない
    const next = submitReducer(seeded, {
      type: "ADD_TO_GROUP",
      groupId: "g1",
      fileTypeKind: "sequence-read",
      entryId: "e1",
    })
    expect(next.submission.fileGroups[0]!.memberFileIds).toEqual(["e1"])
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

  test("submitReducer_editRowCell_doesNotOpenOrCloseModal", () => {
    const opened: UIState = {
      ...addRow(initialState, "sequence-read", "e1", "g1"),
      editing: { kind: "row", entryId: "e1" },
    }
    const next = submitReducer(opened, {
      type: "EDIT_ROW_CELL",
      entryId: "e1",
      patch: { access: "restricted" },
    })
    // EDIT_ROW_CELL は editing を維持する (COMMIT_ROW_EDIT のみ閉じる)
    expect(next.editing).toEqual({ kind: "row", entryId: "e1" })
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

  test("submitReducer_editRowCellOnlyIdInPatch_isNoOpOnFields", () => {
    const seeded = addRow(initialState, "sequence-read", "e1", "g1")
    const next = submitReducer(seeded, {
      type: "EDIT_ROW_CELL",
      entryId: "e1",
      patch: { id: "hijacked" },
    })
    const entry = next.submission.fileEntries[0]!
    expect(entry.id).toBe("e1")
    expect(entry.filename).toBe("read-001.fastq")
  })
})

describe("submitReducer REMOVE_ROW", () => {
  test("submitReducer_removeRow_dropsEntryAndEmptiedGroup", () => {
    const seeded = addRow(initialState, "sequence-read", "e1", "g1")
    const next = submitReducer(seeded, { type: "REMOVE_ROW", entryId: "e1" })
    expect(next.submission.fileEntries).toHaveLength(0)
    expect(next.submission.fileGroups).toHaveLength(0)
    expect(next.editing).toBeNull()
  })

  test("submitReducer_removeRowFromSharedGroup_keepsGroupAndSibling", () => {
    let state = addRow(initialState, "sequence-read", "e1", "g1")
    state = submitReducer(state, {
      type: "ADD_TO_GROUP",
      groupId: "g1",
      fileTypeKind: "sequence-read",
      entryId: "e2",
    })
    const next = submitReducer(state, { type: "REMOVE_ROW", entryId: "e1" })
    expect(next.submission.fileEntries.map((e) => e.id)).toEqual(["e2"])
    expect(next.submission.fileGroups).toHaveLength(1)
    expect(next.submission.fileGroups[0]!.memberFileIds).toEqual(["e2"])
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

describe("submitReducer editing actions", () => {
  test("submitReducer_openEditRow_setsRowEditing", () => {
    const next = submitReducer(initialState, { type: "OPEN_EDIT_ROW", entryId: "e1" })
    expect(next.editing).toEqual({ kind: "row", entryId: "e1" })
  })

  test("submitReducer_openConfirmDelete_setsConfirmDeleteEditing", () => {
    const next = submitReducer(initialState, { type: "OPEN_CONFIRM_DELETE", entryId: "e1" })
    expect(next.editing).toEqual({ kind: "confirm-delete", entryId: "e1" })
  })

  test("submitReducer_closeModal_resetsEditing", () => {
    const opened: UIState = { ...initialState, editing: { kind: "row", entryId: "e1" } }
    const next = submitReducer(opened, { type: "CLOSE_MODAL" })
    expect(next.editing).toBeNull()
  })

  test("submitReducer_commitRowEdit_appliesGroupTypeDataFormChipsAndClosesModal", () => {
    const seeded: UIState = {
      ...addRow(initialState, "sequence-read", "e1", "g1"),
      editing: { kind: "row", entryId: "e1" },
    }
    const next = submitReducer(seeded, {
      type: "COMMIT_ROW_EDIT",
      entryId: "e1",
      patch: {
        groupType: "pair-end",
        dataForm: "assembled",
        chipTags: [{ axis: "assembly-form", value: "primary" }],
      },
    })
    expect(next.submission.fileGroups[0]!.groupType).toBe("pair-end")
    expect(next.submission.fileEntries[0]!.dataForm).toBe("assembled")
    expect(next.submission.fileEntries[0]!.chipTags).toEqual([
      { axis: "assembly-form", value: "primary" },
    ])
    expect(next.editing).toBeNull()
  })

  test("submitReducer_commitRowEditUnknownEntry_returnsStateUnchanged", () => {
    const seeded = addRow(initialState, "sequence-read", "e1", "g1")
    const next = submitReducer(seeded, {
      type: "COMMIT_ROW_EDIT",
      entryId: "ghost",
      patch: { dataForm: "assembled" },
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

describe("defaultFilenameFor", () => {
  test("defaultFilenameFor_emptyList_returnsFirstSerial", () => {
    expect(defaultFilenameFor([], "sequence-read")).toBe("read-001.fastq")
  })

  test("defaultFilenameFor_existingSerials_returnsMaxPlusOne", () => {
    const entries = [
      entryWith("sequence-read", "read-001.fastq"),
      entryWith("sequence-read", "read-002.fastq"),
    ]
    expect(defaultFilenameFor(entries, "sequence-read")).toBe("read-003.fastq")
  })

  test("defaultFilenameFor_gappedSerials_usesMaxPlusOneAndDoesNotRefillGap", () => {
    const entries = [
      entryWith("sequence-read", "read-001.fastq"),
      entryWith("sequence-read", "read-005.fastq"),
    ]
    expect(defaultFilenameFor(entries, "sequence-read")).toBe("read-006.fastq")
  })

  test("defaultFilenameFor_otherKindsSerials_areIgnored", () => {
    const entries = [entryWith("sequence-nucleotide", "seq-009.fasta")]
    expect(defaultFilenameFor(entries, "sequence-read")).toBe("read-001.fastq")
  })

  test("defaultFilenameFor_nonMatchingNames_areIgnored", () => {
    const entries = [
      entryWith("sequence-read", "my-reads.fastq"),
      entryWith("sequence-read", ""),
    ]
    expect(defaultFilenameFor(entries, "sequence-read")).toBe("read-001.fastq")
  })

  test("defaultFilenameFor_serialWithoutExtension_stillCounts", () => {
    // regex は prefix-<digits> のみで拡張子を要求しないので末尾が違っても採番対象
    const entries = [entryWith("sequence-read", "read-007-rerun")]
    expect(defaultFilenameFor(entries, "sequence-read")).toBe("read-008.fastq")
  })

  test("defaultFilenameFor_leadingZeroSerial_parsedAsDecimalNotOctal", () => {
    const entries = [entryWith("sequence-read", "read-010.fastq")]
    expect(defaultFilenameFor(entries, "sequence-read")).toBe("read-011.fastq")
  })

  test("defaultFilenameFor_serialBeyondThreeDigits_padsToAtLeastThree", () => {
    const entries = [entryWith("variant", "var-1000.vcf")]
    expect(defaultFilenameFor(entries, "variant")).toBe("var-1001.vcf")
  })

  test("defaultFilenameFor_everyKind_returnsExpectedPrefixAndExtension", () => {
    const expected: Record<FileEntry["fileTypeKind"], string> = {
      "sequence-read": "read-001.fastq",
      "sequence-nucleotide": "seq-001.fasta",
      "sequence-annotation": "ann-001.gff",
      "variant": "var-001.vcf",
      "expression-matrix": "mtx-001.tsv",
      "microarray-expression": "arr-001.cel",
      "spatial-transcriptomics": "spt-001.tsv",
      "spatial-image": "img-001.tiff",
      "mass-spectrometry": "ms-001.mzML",
      "nmr": "nmr-001.nmrML",
      "metabolite-assignment": "maf-001.tsv",
    }
    for (const kind of FileTypeKind.options) {
      expect(defaultFilenameFor([], kind)).toBe(expected[kind])
    }
  })
})
