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

const stateOf = (submission: Submission): UIState => ({ submission })

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

  test("rowIsConfigured_noDetailKind_returnsTrue", () => {
    // 詳細質問を持たない種別は設定するものが無いので設定済み扱い
    const state = addRow(initialState, "sequence-read", "e1", "g1")

    expect(rowIsConfigured(state, "e1")).toBe(true)
  })

  test("rowIsConfigured_freshStandaloneSequence_returnsTrue", () => {
    // 単独配列 (既定 single) はそのまま妥当な答えなので最初から設定済み
    const state = addRow(initialState, "sequence-nucleotide", "e1", "g1")

    expect(rowIsConfigured(state, "e1")).toBe(true)
  })

  test("rowIsConfigured_freshStandaloneAnnotation_returnsTrue", () => {
    const state = addRow(initialState, "sequence-annotation", "e1", "g1")

    expect(rowIsConfigured(state, "e1")).toBe(true)
  })

  test("rowIsConfigured_freshSpatialWithoutPlatform_returnsFalse", () => {
    // platform を選ぶまでは未設定 (既定ではどのラジオも選ばれていない)
    const state = addRow(initialState, "spatial-transcriptomics", "e1", "g1")

    expect(rowIsConfigured(state, "e1")).toBe(false)
  })

  test("rowIsConfigured_spatialWithPlatform_returnsTrue", () => {
    const seeded = addRow(initialState, "spatial-transcriptomics", "e1", "g1")
    const state = submitReducer(seeded, {
      type: "COMMIT_ROW_EDIT",
      entryId: "e1",
      patch: { chipTags: [{ axis: "spatial-platform", value: "visium" }] },
      releasedGroupId: "rel",
    })

    expect(rowIsConfigured(state, "e1")).toBe(true)
  })

  test("rowIsConfigured_freshMassSpectrometry_returnsFalse", () => {
    const state = addRow(initialState, "mass-spectrometry", "e1", "g1")

    expect(rowIsConfigured(state, "e1")).toBe(false)
  })

  test("rowIsConfigured_magChainSequence_returnsTrue", () => {
    const seeded = addRow(initialState, "sequence-nucleotide", "e1", "g1")
    const state = submitReducer(seeded, {
      type: "COMMIT_ROW_EDIT",
      entryId: "e1",
      patch: { groupType: "mag-sag-chain", chipTags: [{ axis: "assembly-form", value: "mag" }] },
      releasedGroupId: "rel",
    })

    expect(rowIsConfigured(state, "e1")).toBe(true)
  })

  const pairedState = (): UIState => {
    let state = addRow(initialState, "sequence-annotation", "ann", "g-ann")
    state = addRow(state, "sequence-nucleotide", "fa", "g-fa")
    state = submitReducer(state, {
      type: "COMMIT_ROW_EDIT",
      entryId: "ann",
      patch: { groupType: "assembly-annotation" },
      releasedGroupId: "rel-a",
    })

    return submitReducer(state, {
      type: "SET_PAIR_PARTNER",
      annotationEntryId: "ann",
      partnerEntryId: "fa",
      releasedGroupId: "rel-b",
    })
  }

  test("rowIsConfigured_annotationPairWithoutPartner_returnsFalse", () => {
    let state = addRow(initialState, "sequence-annotation", "ann", "g-ann")
    state = submitReducer(state, {
      type: "COMMIT_ROW_EDIT",
      entryId: "ann",
      patch: { groupType: "assembly-annotation" },
      releasedGroupId: "rel",
    })

    expect(rowIsConfigured(state, "ann")).toBe(false)
  })

  test("rowIsConfigured_annotationPairWithPartner_returnsTrue", () => {
    expect(rowIsConfigured(pairedState(), "ann")).toBe(true)
  })

  test("rowIsConfigured_pairedNucleotidePartner_returnsTrue", () => {
    expect(rowIsConfigured(pairedState(), "fa")).toBe(true)
  })

  test("countConfiguredRows_countsAnsweredAndNoDetailRowsAsDone", () => {
    let state = addRow(initialState, "sequence-nucleotide", "e1", "g1") // single default → 設定済み
    state = addRow(state, "spatial-transcriptomics", "e2", "g2") // platform 未選択 → 未設定
    state = addRow(state, "sequence-read", "e3", "g3") // 詳細なし → 完了扱い

    expect(countConfiguredRows(state)).toEqual({ configured: 2, total: 3 })
  })

  test("countConfiguredRows_emptyState_isZeroOfZero", () => {
    expect(countConfiguredRows(initialState)).toEqual({ configured: 0, total: 0 })
  })
})
