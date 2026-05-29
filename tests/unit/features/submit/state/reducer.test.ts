import { describe, expect, test } from "vitest"

import {
  defaultFilenameFor,
  initialState,
  submitReducer,
} from "../../../../../app/features/submit/state/reducer"
import type { FileEntry } from "../../../../../app/schemas/submit"
import { ButtonType } from "../../../../../app/schemas/submit"

const entryWith = (buttonType: ButtonType, filename: string): FileEntry => ({
  id: `id-${filename}`,
  buttonType,
  filename,
  organism: "" as FileEntry["organism"],
  access: "open",
  dataForm: "raw",
  groupId: "g",
  chipTags: [],
})

describe("submitReducer", () => {
  test("ADD_ROW_addsOneEntryWithDefaultFilenameAndNoModal", () => {
    const next = submitReducer(initialState, {
      type: "ADD_ROW",
      buttonType: "sequence-read",
      entryId: "e1",
      groupId: "g1",
    })
    expect(next.submission.fileEntries).toHaveLength(1)
    expect(next.submission.fileGroups).toHaveLength(1)
    expect(next.submission.fileGroups[0]!.memberFileIds).toEqual(["e1"])
    expect(next.submission.fileEntries[0]!.filename).toBe("read-001.fastq")
    expect(next.editing).toBeNull()
  })

  test("ADD_ROW_assignsSequentialDefaultFilenamePerButtonType", () => {
    let state = submitReducer(initialState, {
      type: "ADD_ROW",
      buttonType: "sequence-read",
      entryId: "e1",
      groupId: "g1",
    })
    state = submitReducer(state, {
      type: "ADD_ROW",
      buttonType: "sequence-read",
      entryId: "e2",
      groupId: "g2",
    })
    state = submitReducer(state, {
      type: "ADD_ROW",
      buttonType: "assembled",
      entryId: "e3",
      groupId: "g3",
    })

    expect(state.submission.fileEntries.map((e) => e.filename)).toEqual([
      "read-001.fastq",
      "read-002.fastq",
      "asm-001.fasta",
    ])
  })

  test("ADD_ROW_afterRemovingMiddleRowSkipsGapAndAvoidsCollision", () => {
    let state = initialState
    for (const [entryId, groupId] of [["e1", "g1"], ["e2", "g2"], ["e3", "g3"]]) {
      state = submitReducer(state, {
        type: "ADD_ROW",
        buttonType: "sequence-read",
        entryId: entryId!,
        groupId: groupId!,
      })
    }
    state = submitReducer(state, { type: "REMOVE_ROW", entryId: "e2" })
    state = submitReducer(state, {
      type: "ADD_ROW",
      buttonType: "sequence-read",
      entryId: "e4",
      groupId: "g4",
    })

    expect(state.submission.fileEntries.map((e) => e.filename)).toEqual([
      "read-001.fastq",
      "read-003.fastq",
      "read-004.fastq",
    ])
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

describe("defaultFilenameFor", () => {
  test("returnsFirstNumberForEmptyList", () => {
    expect(defaultFilenameFor([], "sequence-read")).toBe("read-001.fastq")
  })

  test("takesMaxPlusOneAcrossExistingSerials", () => {
    const entries = [
      entryWith("sequence-read", "read-001.fastq"),
      entryWith("sequence-read", "read-002.fastq"),
    ]
    expect(defaultFilenameFor(entries, "sequence-read")).toBe("read-003.fastq")
  })

  test("usesMaxPlusOneEvenWithGapsAndDoesNotRefillGap", () => {
    const entries = [
      entryWith("sequence-read", "read-001.fastq"),
      entryWith("sequence-read", "read-005.fastq"),
    ]
    expect(defaultFilenameFor(entries, "sequence-read")).toBe("read-006.fastq")
  })

  test("ignoresSerialsOfOtherButtonTypes", () => {
    const entries = [entryWith("assembled", "asm-009.fasta")]
    expect(defaultFilenameFor(entries, "sequence-read")).toBe("read-001.fastq")
  })

  test("ignoresHandEditedFilenamesThatDoNotMatchSerialPattern", () => {
    const entries = [
      entryWith("sequence-read", "my-reads.fastq"),
      entryWith("sequence-read", ""),
    ]
    expect(defaultFilenameFor(entries, "sequence-read")).toBe("read-001.fastq")
  })

  test("returnsExpectedPrefixAndExtensionForEveryButtonType", () => {
    const expected: Record<ButtonType, string> = {
      "sequence-read": "read-001.fastq",
      "assembled": "asm-001.fasta",
      "gene-annotation": "ann-001.gff",
      "variation": "var-001.vcf",
      "phenotype": "phe-001.tsv",
      "microarray-expression": "arr-001.cel",
      "rna-seq-matrix": "mtx-001.tsv",
      "mass-spec": "ms-001.mzML",
      "spatial-tx": "spt-001.tsv",
    }
    for (const bt of ButtonType.options) {
      expect(defaultFilenameFor([], bt)).toBe(expected[bt])
    }
  })
})
