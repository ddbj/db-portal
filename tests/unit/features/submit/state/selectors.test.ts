import { describe, expect, test } from "vitest"

import { isKindEnabled } from "../../../../../app/features/submit/cascade"
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
  OrganismDomain,
  type Submission,
} from "../../../../../app/schemas/submit"

const stateOf = (submission: Submission): UIState => ({ submission })

const addRow = (state: UIState, fileTypeKind: FileTypeKind, entryId: string, groupId: string): UIState =>
  submitReducer(state, { type: "ADD_ROW", fileTypeKind, entryId, groupId })

const withOrganismDomain = (organismDomain: OrganismDomain): UIState =>
  submitReducer(initialState, { type: "SET_ORGANISM_DOMAIN", organismDomain })

const kindsOf = (state: UIState, kind: string): boolean =>
  selectValidations(state).some((v) => v.kind === kind)

const defaultAccessSection = {
  restrictedPreference: false,
  hasIdentifier: false,
  ethicsCompliance: true,
  publiclyAvailable: false,
  microbialAnalysis: false,
}

describe("selectValidations", () => {
  test("selectValidations_kindEnabledByOrganismDomain_noPreconditionConflict", () => {
    expect(isKindEnabled("human", "sequence-read")).toBe(true)
    const state = addRow(withOrganismDomain("human"), "sequence-read", "e1", "g1")

    expect(kindsOf(state, "precondition-conflict")).toBe(false)
  })

  test("selectValidations_organismDomainNull_reportsPreconditionConflict", () => {
    const state = addRow(initialState, "sequence-read", "e1", "g1")

    expect(state.submission.preconditions.organismDomain).toBeNull()
    expect(isKindEnabled(null, "sequence-read")).toBe(false)
    expect(selectValidations(state)).toContainEqual({ kind: "precondition-conflict", entryId: "e1" })
  })

  test("selectValidations_entryGroupIdNotInGroups_reportsDanglingGroupId", () => {
    const state = stateOf({
      preconditions: { organismDomain: "human" },
      accessSection: defaultAccessSection,
      fileEntries: [
        {
          id: "e1",
          fileTypeKind: "sequence-read",
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
    const state = addRow(initialState, "sequence-read", "e1", "g1")

    expect(kindsOf(state, "dangling-group-id")).toBe(false)
  })

  test("selectValidations_normalEnabledRow_isEmpty", () => {
    const seeded = addRow(withOrganismDomain("human"), "sequence-read", "e1", "g1")

    expect(selectValidations(seeded)).toEqual([])
  })

  test("selectValidations_emptyState_isEmpty", () => {
    expect(selectValidations(initialState)).toEqual([])
  })

  test("selectValidations_anyEnabledEntryAcrossCatalog_neverReportsNoDestinationService", () => {
    for (const organismDomain of OrganismDomain.options) {
      for (const kind of FileTypeKind.options) {
        if (!isKindEnabled(organismDomain, kind)) continue
        const state = stateOf({
          preconditions: { organismDomain },
          accessSection: defaultAccessSection,
          fileEntries: [
            {
              id: "e0",
              fileTypeKind: kind,
              access: "open",
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
  })

  test("selectValidations_recipeOwnedEntry_stillCoveredByDestinationStep", () => {
    const submission: Submission = {
      preconditions: { organismDomain: "prokaryote" },
      accessSection: defaultAccessSection,
      fileEntries: [
        {
          id: "e0",
          fileTypeKind: "sequence",
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
})

describe("rowIsConfigured / countConfiguredRows", () => {
  test("rowIsConfigured_unknownEntry_returnsFalse", () => {
    expect(rowIsConfigured(initialState, "nope")).toBe(false)
  })

  test("rowIsConfigured_noDetailKind_returnsTrue", () => {
    const state = addRow(initialState, "sequence-read", "e1", "g1")

    expect(rowIsConfigured(state, "e1")).toBe(true)
  })

  test("rowIsConfigured_freshSequence_returnsTrue", () => {
    const state = addRow(initialState, "sequence", "e1", "g1")

    expect(rowIsConfigured(state, "e1")).toBe(true)
  })

  test("rowIsConfigured_freshSpatialWithoutPlatform_returnsFalse", () => {
    const state = addRow(initialState, "spatial-transcriptomics", "e1", "g1")

    expect(rowIsConfigured(state, "e1")).toBe(false)
  })

  test("rowIsConfigured_spatialWithPlatform_returnsTrue", () => {
    const seeded = addRow(initialState, "spatial-transcriptomics", "e1", "g1")
    const state = submitReducer(seeded, {
      type: "COMMIT_ROW_EDIT",
      entryId: "e1",
      patch: { chipTags: [{ axis: "spatial-platform", value: "visium" }] },
    })

    expect(rowIsConfigured(state, "e1")).toBe(true)
  })

  test("rowIsConfigured_freshMetabolomics_returnsTrue", () => {
    const state = addRow(initialState, "metabolomics", "e1", "g1")

    expect(rowIsConfigured(state, "e1")).toBe(true)
  })

  test("rowIsConfigured_magChainSequence_returnsTrue", () => {
    const seeded = addRow(initialState, "sequence", "e1", "g1")
    const state = submitReducer(seeded, {
      type: "COMMIT_ROW_EDIT",
      entryId: "e1",
      patch: { groupType: "mag-sag-chain", chipTags: [{ axis: "assembly-form", value: "mag" }] },
    })

    expect(rowIsConfigured(state, "e1")).toBe(true)
  })

  test("countConfiguredRows_countsAnsweredAndNoDetailRowsAsDone", () => {
    let state = addRow(initialState, "sequence", "e1", "g1")
    state = addRow(state, "spatial-transcriptomics", "e2", "g2")
    state = addRow(state, "sequence-read", "e3", "g3")

    expect(countConfiguredRows(state)).toEqual({ configured: 2, total: 3 })
  })

  test("countConfiguredRows_emptyState_isZeroOfZero", () => {
    expect(countConfiguredRows(initialState)).toEqual({ configured: 0, total: 0 })
  })
})
