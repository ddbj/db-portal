import { describe, expect, test } from "vitest"

import { isKindEnabled, isQ2Enabled } from "../../../../../app/features/submit/cascade"
import { initialState, submitReducer } from "../../../../../app/features/submit/state/reducer"
import {
  countConfiguredRows,
  rowIsConfigured,
  selectSteps,
  selectValidations,
} from "../../../../../app/features/submit/state/selectors"
import type { UIState } from "../../../../../app/features/submit/state/types"
import {
  FileTypeKind,
  isDestinationService,
  Q1,
  Q2,
  type Submission,
} from "../../../../../app/schemas/submit"

const stateOf = (submission: Submission): UIState => ({ submission, editing: null })

const addRow = (state: UIState, fileTypeKind: FileTypeKind, entryId: string, groupId: string): UIState =>
  submitReducer(state, { type: "ADD_ROW", fileTypeKind, entryId, groupId })

const withPrecond = (q1: Q1, q2: Q2): UIState => {
  const a = submitReducer(initialState, { type: "SET_Q1", q1 })

  return submitReducer(a, { type: "SET_Q2", q2 })
}

const kindsOf = (state: UIState, kind: string): boolean =>
  selectValidations(state).some((v) => v.kind === kind)

describe("selectValidations", () => {
  test("selectValidations_kindDisabledByPrecond_reportsPreconditionConflict", () => {
    // restricted forces JGA-only repos; expression-matrix (gea only) is disabled under restricted/human
    expect(isKindEnabled("restricted", "human", "expression-matrix")).toBe(false)
    const state = addRow(withPrecond("restricted", "human"), "expression-matrix", "e1", "g1")

    expect(selectValidations(state)).toContainEqual({ kind: "precondition-conflict", entryId: "e1" })
  })

  test("selectValidations_kindEnabledByPrecond_noPreconditionConflict", () => {
    // sequence-read is JGA-capable, so it stays enabled under restricted/human
    expect(isKindEnabled("restricted", "human", "sequence-read")).toBe(true)
    const state = addRow(withPrecond("restricted", "human"), "sequence-read", "e1", "g1")

    expect(kindsOf(state, "precondition-conflict")).toBe(false)
  })

  test("selectValidations_q2ClearedByQ1Change_reportsPreconditionConflict", () => {
    // SET_Q1=restricted clears the now-incompatible Q2 to null; the disabled row must still surface a conflict
    const state = addRow(submitReducer(initialState, { type: "SET_Q1", q1: "restricted" }), "expression-matrix", "e1", "g1")

    expect(state.submission.preconditions).toEqual({ q1: "restricted", q2: null })
    expect(isKindEnabled("restricted", null, "expression-matrix")).toBe(false)
    expect(selectValidations(state)).toContainEqual({ kind: "precondition-conflict", entryId: "e1" })
  })

  test("selectValidations_entryGroupIdNotInGroups_reportsDanglingGroupId", () => {
    const state = stateOf({
      preconditions: { q1: null, q2: null },
      fileEntries: [
        {
          id: "e1",
          fileTypeKind: "sequence-read",
          filename: "read-001.fastq",
          access: "open",
          dataForm: "raw",
          groupId: "ghost",
          chipTags: [],
        },
      ],
      fileGroups: [],
      notes: "",
    })

    expect(selectValidations(state)).toContainEqual({ kind: "dangling-group-id", entryId: "e1" })
  })

  test("selectValidations_reducerBuiltRow_hasNoDanglingGroupId", () => {
    // ADD_ROW always creates the matching group, so the group id resolves
    const state = addRow(initialState, "sequence-read", "e1", "g1")

    expect(kindsOf(state, "dangling-group-id")).toBe(false)
  })

  test("selectValidations_normalEnabledRow_isEmpty", () => {
    const seeded = addRow(withPrecond("public", "human"), "sequence-read", "e1", "g1")

    expect(selectValidations(seeded)).toEqual([])
  })

  test("selectValidations_emptyState_isEmpty", () => {
    expect(selectValidations(initialState)).toEqual([])
  })

  // Every enabled entry is routed into a destination step by the catalog fallback,
  // so no-destination-service must never surface for a well-formed submission.
  test("selectValidations_anyEnabledEntryAcrossCatalog_neverReportsNoDestinationService", () => {
    for (const q1 of Q1.options) {
      for (const q2 of Q2.options) {
        if (!isQ2Enabled(q1, q2)) continue
        const access = q1 === "public" ? "open" : "restricted"
        for (const kind of FileTypeKind.options) {
          const state = stateOf({
            preconditions: { q1, q2 },
            fileEntries: [
              {
                id: "e0",
                fileTypeKind: kind,
                filename: "f.dat",
                access,
                dataForm: "raw",
                groupId: "g0",
                chipTags: [],
              },
            ],
            fileGroups: [{ id: "g0", groupType: "single", memberFileIds: ["e0"], linkedGroupIds: [] }],
            notes: "",
          })

          expect(kindsOf(state, "no-destination-service")).toBe(false)
        }
      }
    }
  })

  test("selectValidations_recipeOwnedEntry_stillCoveredByDestinationStep", () => {
    // a mag-sag-chain/mag group routes through the mag-project recipe; its entry must
    // still appear in a destination step's scope, so no-destination-service stays silent
    const submission: Submission = {
      preconditions: { q1: "public", q2: "prokaryote" },
      fileEntries: [
        {
          id: "e0",
          fileTypeKind: "sequence-nucleotide",
          filename: "seq-001.fasta",
          access: "open",
          dataForm: "assembled",
          groupId: "g0",
          chipTags: [{ axis: "assembly-form", value: "mag" }],
        },
      ],
      fileGroups: [{ id: "g0", groupType: "mag-sag-chain", memberFileIds: ["e0"], linkedGroupIds: [] }],
      notes: "",
    }
    const steps = selectSteps(stateOf(submission))
    const destEntryIds = new Set(
      steps.filter((s) => isDestinationService(s.service)).flatMap((s) => s.scope.entryIds),
    )

    expect(destEntryIds.has("e0")).toBe(true)
    expect(kindsOf(stateOf(submission), "no-destination-service")).toBe(false)
  })

  test("selectValidations_oneRowManyDefects_reportsEachIndependently", () => {
    // a single entry can trip multiple validation kinds at once
    const state = stateOf({
      preconditions: { q1: "restricted", q2: "human" },
      fileEntries: [
        {
          id: "e1",
          fileTypeKind: "expression-matrix",
          filename: "mtx-001.tsv",
          access: "restricted",
          dataForm: "matrix",
          groupId: "ghost",
          chipTags: [],
        },
      ],
      fileGroups: [],
      notes: "",
    })
    const kinds = selectValidations(state).map((v) => v.kind)

    expect(kinds).toContain("precondition-conflict")
    expect(kinds).toContain("dangling-group-id")
  })
})

describe("rowIsConfigured / countConfiguredRows", () => {
  test("rowIsConfigured_unknownEntry_returnsFalse", () => {
    expect(rowIsConfigured(initialState, "nope")).toBe(false)
  })

  test("rowIsConfigured_freshDefaultRow_returnsFalse", () => {
    const state = addRow(initialState, "sequence-read", "e1", "g1")

    expect(rowIsConfigured(state, "e1")).toBe(false)
  })

  test("rowIsConfigured_chipAdded_returnsTrue", () => {
    const seeded = addRow(initialState, "sequence-read", "e1", "g1")
    const state = submitReducer(seeded, {
      type: "EDIT_ROW_CELL",
      entryId: "e1",
      patch: { chipTags: [{ axis: "mass-spec-domain", value: "proteomics" }] },
    })

    expect(rowIsConfigured(state, "e1")).toBe(true)
  })

  test("rowIsConfigured_dataFormChangedFromTypical_returnsTrue", () => {
    const seeded = addRow(initialState, "sequence-read", "e1", "g1")
    const state = submitReducer(seeded, {
      type: "EDIT_ROW_CELL",
      entryId: "e1",
      patch: { dataForm: "assembled" },
    })

    expect(rowIsConfigured(state, "e1")).toBe(true)
  })

  test("rowIsConfigured_groupTypeChangedFromTypical_returnsTrue", () => {
    const seeded = addRow(initialState, "sequence-read", "e1", "g1")
    const state = submitReducer(seeded, {
      type: "COMMIT_ROW_EDIT",
      entryId: "e1",
      patch: { groupType: "pair-end", dataForm: "raw", chipTags: [] },
    })

    expect(rowIsConfigured(state, "e1")).toBe(true)
  })

  test("rowIsConfigured_groupTypeMatchesTypicalForKind_returnsFalse", () => {
    // microarray-expression has typical group type mage-tab; leaving it as-is is "not configured"
    const state = addRow(initialState, "microarray-expression", "e1", "g1")

    expect(state.submission.fileGroups[0]!.groupType).toBe("mage-tab")
    expect(rowIsConfigured(state, "e1")).toBe(false)
  })

  test("countConfiguredRows_mixOfDetailAndNoDetailKinds_countsConfiguredAndNoDetailAsDone", () => {
    let state = addRow(initialState, "sequence-nucleotide", "e1", "g1") // detail kind, configured below
    state = addRow(state, "sequence-nucleotide", "e2", "g2") // detail kind, left fresh
    state = addRow(state, "sequence-read", "e3", "g3") // no-detail kind, nothing to configure
    state = submitReducer(state, {
      type: "COMMIT_ROW_EDIT",
      entryId: "e1",
      patch: {
        groupType: "mag-sag-chain",
        dataForm: "assembled",
        chipTags: [{ axis: "assembly-form", value: "mag" }],
      },
    })

    // e1 has detail set, e3 needs none; only the fresh detail-kind row e2 remains
    expect(countConfiguredRows(state)).toEqual({ configured: 2, total: 3 })
  })

  test("countConfiguredRows_emptyState_isZeroOfZero", () => {
    expect(countConfiguredRows(initialState)).toEqual({ configured: 0, total: 0 })
  })
})
