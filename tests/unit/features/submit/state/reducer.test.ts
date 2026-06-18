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

const withQ2 = (q2: "human" | "eukaryote" | "prokaryote" | "virus" | "metagenome"): UIState =>
  submitReducer(initialState, { type: "SET_Q2", q2 })

describe("submitReducer preconditions", () => {
  test("submitReducer_setQ2_updatesPreconditionQ2", () => {
    const next = submitReducer(initialState, { type: "SET_Q2", q2: "human" })
    expect(next.submission.preconditions.q2).toBe("human")
  })

  test("submitReducer_setAccessSection_updatesAccessSection", () => {
    const next = submitReducer(initialState, {
      type: "SET_ACCESS_SECTION",
      accessSection: { restrictedPreference: true },
    })
    expect(next.submission.accessSection.restrictedPreference).toBe(true)
  })

  test("submitReducer_setAccessSection_exclusiveToggles", () => {
    const next = submitReducer(initialState, {
      type: "SET_ACCESS_SECTION",
      accessSection: { publiclyAvailable: true },
    })
    expect(next.submission.accessSection.publiclyAvailable).toBe(true)
    expect(next.submission.accessSection.ethicsCompliance).toBe(false)
    expect(next.submission.accessSection.microbialAnalysis).toBe(false)
  })

  test("submitReducer_setAccessSection_recomputesEntryAccess", () => {
    let state = withQ2("human")
    state = addRow(state, "sequence-read", "e1", "g1")
    expect(state.submission.fileEntries[0]!.access).toBe("restricted")
    const next = submitReducer(state, {
      type: "SET_ACCESS_SECTION",
      accessSection: { publiclyAvailable: true },
    })
    expect(next.submission.fileEntries[0]!.access).toBe("open")
  })

  test("submitReducer_setAccessSection_ethicsCompliance_splitsAccessByIdentifiability", () => {
    let state = withQ2("human")
    state = addRow(state, "sequence-read", "e1", "g1")
    state = addRow(state, "expression-matrix", "e2", "g2")
    const reads = state.submission.fileEntries.find((e) => e.fileTypeKind === "sequence-read")!
    const expr = state.submission.fileEntries.find((e) => e.fileTypeKind === "expression-matrix")!
    expect(reads.access).toBe("restricted")
    expect(expr.access).toBe("open")
  })

  test("submitReducer_setAccessSection_restrictedPreference_allRestricted", () => {
    let state = withQ2("human")
    state = addRow(state, "sequence-read", "e1", "g1")
    state = addRow(state, "expression-matrix", "e2", "g2")
    const next = submitReducer(state, {
      type: "SET_ACCESS_SECTION",
      accessSection: { restrictedPreference: true },
    })
    expect(next.submission.fileEntries.every((e) => e.access === "restricted")).toBe(true)
  })

  test("submitReducer_setQ2_resetsAccessSectionToDefault", () => {
    let state = submitReducer(initialState, { type: "SET_Q2", q2: "human" })
    state = submitReducer(state, {
      type: "SET_ACCESS_SECTION",
      accessSection: { restrictedPreference: true },
    })
    expect(state.submission.accessSection.restrictedPreference).toBe(true)
    const next = submitReducer(state, { type: "SET_Q2", q2: "eukaryote" })
    expect(next.submission.accessSection).toEqual({
      restrictedPreference: false,
      ethicsCompliance: true,
      publiclyAvailable: false,
      microbialAnalysis: false,
    })
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

  test("submitReducer_addRowHumanDefaultAccess_identifiableKindGetsRestricted", () => {
    const next = addRow(withQ2("human"), "sequence-read", "e1", "g1")
    expect(next.submission.fileEntries[0]!.access).toBe("restricted")
  })

  test("submitReducer_addRowHumanDefaultAccess_nonIdentifiableKindGetsOpen", () => {
    const next = addRow(withQ2("human"), "expression-matrix", "e1", "g1")
    expect(next.submission.fileEntries[0]!.access).toBe("open")
  })

  test("submitReducer_addRowNonHuman_injectsOpenAccess", () => {
    const next = addRow(withQ2("prokaryote"), "sequence-read", "e1", "g1")
    expect(next.submission.fileEntries[0]!.access).toBe("open")
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
        chipTags: [{ axis: "tpa", value: "true" }],
      },
    })
    const entry = next.submission.fileEntries[0]!
    expect(entry.id).toBe("e1")
    expect(entry.fileTypeKind).toBe("sequence-read")
    expect(entry.groupId).toBe("g1")
    expect(entry.access).toBe("restricted")
    expect(entry.dataForm).toBe("assembled")
    expect(entry.chipTags).toEqual([{ axis: "tpa", value: "true" }])
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
