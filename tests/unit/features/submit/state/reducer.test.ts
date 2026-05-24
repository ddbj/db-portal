import { describe, expect, test } from "vitest"

import {
  initialState,
  submitReducer,
} from "../../../../../app/features/submit/state/reducer"

describe("submitReducer", () => {
  test("ADD_ROW_addsOneEntryAndOpensEditModal", () => {
    const next = submitReducer(initialState, {
      type: "ADD_ROW",
      buttonType: "sequence-read",
      entryId: "e1",
      groupId: "g1",
    })
    expect(next.submission.fileEntries).toHaveLength(1)
    expect(next.submission.fileGroups).toHaveLength(1)
    expect(next.submission.fileGroups[0]!.memberFileIds).toEqual(["e1"])
    expect(next.editing).toEqual({ kind: "row", entryId: "e1" })
  })

  test("ADD_ROW_sequenceReadDefaultsToTypicalDataFormAndGroupType", () => {
    const next = submitReducer(initialState, {
      type: "ADD_ROW",
      buttonType: "sequence-read",
      entryId: "e1",
      groupId: "g1",
    })
    const entry = next.submission.fileEntries[0]!
    expect(entry.dataForm).toBe("raw")
    expect(entry.access).toBe("open")
    expect(entry.organism).toBe("")
    expect(next.submission.fileGroups[0]!.groupType).toBe("single")
  })

  test("ADD_TO_GROUP_addsEntryToExistingGroup", () => {
    const seeded = submitReducer(initialState, {
      type: "ADD_ROW",
      buttonType: "sequence-read",
      entryId: "e1",
      groupId: "g1",
    })
    const next = submitReducer(seeded, {
      type: "ADD_TO_GROUP",
      groupId: "g1",
      buttonType: "sequence-read",
      entryId: "e2",
    })
    expect(next.submission.fileEntries).toHaveLength(2)
    expect(next.submission.fileGroups).toHaveLength(1)
    expect(next.submission.fileGroups[0]!.memberFileIds).toEqual(["e1", "e2"])
  })

  test("EDIT_ROW_CELL_preservesIdAndButtonType", () => {
    const seeded = submitReducer(initialState, {
      type: "ADD_ROW",
      buttonType: "sequence-read",
      entryId: "e1",
      groupId: "g1",
    })
    const next = submitReducer(seeded, {
      type: "EDIT_ROW_CELL",
      entryId: "e1",
      patch: { id: "hijacked", buttonType: "variation", filename: "foo.fastq", organism: "human" },
    })
    const entry = next.submission.fileEntries[0]!
    expect(entry.id).toBe("e1")
    expect(entry.buttonType).toBe("sequence-read")
    expect(entry.filename).toBe("foo.fastq")
    expect(entry.organism).toBe("human")
  })

  test("REMOVE_ROW_dropsEntryAndCollapsesEmptyGroup", () => {
    const seeded = submitReducer(initialState, {
      type: "ADD_ROW",
      buttonType: "sequence-read",
      entryId: "e1",
      groupId: "g1",
    })
    const next = submitReducer(seeded, { type: "REMOVE_ROW", entryId: "e1" })
    expect(next.submission.fileEntries).toHaveLength(0)
    expect(next.submission.fileGroups).toHaveLength(0)
  })

  test("COMMIT_ROW_EDIT_appliesPatchAndClosesModal", () => {
    const seeded = submitReducer(initialState, {
      type: "ADD_ROW",
      buttonType: "sequence-read",
      entryId: "e1",
      groupId: "g1",
    })
    const next = submitReducer(seeded, {
      type: "COMMIT_ROW_EDIT",
      entryId: "e1",
      patch: {
        groupType: "pair-end",
        dataForm: "raw",
        chipTags: [{ axis: "provenance", value: "third-party" }],
      },
    })
    expect(next.submission.fileGroups[0]!.groupType).toBe("pair-end")
    expect(next.submission.fileEntries[0]!.chipTags).toEqual([
      { axis: "provenance", value: "third-party" },
    ])
    expect(next.editing).toBeNull()
  })

  test("CLOSE_MODAL_resetsEditing", () => {
    const opened = {
      ...initialState,
      editing: { kind: "row" as const, entryId: "e1" },
    }
    const next = submitReducer(opened, { type: "CLOSE_MODAL" })
    expect(next.editing).toBeNull()
  })

  test("OPEN_CONFIRM_DELETE_setsEditingKind", () => {
    const next = submitReducer(initialState, {
      type: "OPEN_CONFIRM_DELETE",
      entryId: "e1",
    })
    expect(next.editing).toEqual({ kind: "confirm-delete", entryId: "e1" })
  })
})
