import { describe, expect, test } from "vitest"

import { initialState, submitReducer } from "../../../../../app/features/submit/state/reducer"
import {
  countConfiguredRows,
  rowIsConfigured,
  selectRowDetailSummary,
  selectSteps,
  selectValidations,
} from "../../../../../app/features/submit/state/selectors"
import type { UIState } from "../../../../../app/features/submit/state/types"

const seedOneSequenceRead = (): UIState => {
  let state = submitReducer(initialState, {
    type: "ADD_ROW",
    buttonType: "sequence-read",
    entryId: "e1",
    groupId: "g1",
  })
  state = submitReducer(state, {
    type: "EDIT_ROW_CELL",
    entryId: "e1",
    patch: { filename: "read-001.fastq", organism: "eukaryote" },
  })
  return state
}

describe("selectors", () => {
  test("selectSteps_emptyState_yieldsEmpty", () => {
    expect(selectSteps(initialState)).toEqual([])
  })

  test("selectSteps_oneRow_yieldsBpBsAndPath", () => {
    const state = seedOneSequenceRead()
    const steps = selectSteps(state)
    const services = steps.map((s) => s.service)
    expect(services).toContain("biosample")
    expect(services).toContain("bioproject")
  })

  test("selectValidations_missingOrganism_isReported", () => {
    let state = submitReducer(initialState, {
      type: "ADD_ROW",
      buttonType: "sequence-read",
      entryId: "e1",
      groupId: "g1",
    })
    state = submitReducer(state, {
      type: "EDIT_ROW_CELL",
      entryId: "e1",
      patch: { filename: "read.fastq" },
    })
    const validations = selectValidations(state)
    expect(validations.some((v) => v.kind === "missing-organism" && v.entryId === "e1")).toBe(true)
  })

  test("selectValidations_missingFilename_isReported", () => {
    const state = submitReducer(initialState, {
      type: "ADD_ROW",
      buttonType: "sequence-read",
      entryId: "e1",
      groupId: "g1",
    })
    const validations = selectValidations(state)
    expect(validations.some((v) => v.kind === "missing-filename")).toBe(true)
  })

  test("rowIsConfigured_defaultGroupAndNoChips_returnsFalse", () => {
    const state = submitReducer(initialState, {
      type: "ADD_ROW",
      buttonType: "sequence-read",
      entryId: "e1",
      groupId: "g1",
    })
    expect(rowIsConfigured(state, "e1")).toBe(false)
  })

  test("rowIsConfigured_chipsAdded_returnsTrue", () => {
    const seeded = submitReducer(initialState, {
      type: "ADD_ROW",
      buttonType: "sequence-read",
      entryId: "e1",
      groupId: "g1",
    })
    const state = submitReducer(seeded, {
      type: "COMMIT_ROW_EDIT",
      entryId: "e1",
      patch: { groupType: "single", dataForm: "raw", chipTags: [{ axis: "provenance", value: "third-party" }] },
    })
    expect(rowIsConfigured(state, "e1")).toBe(true)
  })

  test("rowIsConfigured_groupTypeChangedFromDefault_returnsTrue", () => {
    const seeded = submitReducer(initialState, {
      type: "ADD_ROW",
      buttonType: "sequence-read",
      entryId: "e1",
      groupId: "g1",
    })
    const state = submitReducer(seeded, {
      type: "COMMIT_ROW_EDIT",
      entryId: "e1",
      patch: { groupType: "pair-end", dataForm: "raw", chipTags: [] },
    })
    expect(rowIsConfigured(state, "e1")).toBe(true)
  })

  test("countConfiguredRows_returnsTotalsAndConfigured", () => {
    let state = submitReducer(initialState, {
      type: "ADD_ROW",
      buttonType: "sequence-read",
      entryId: "e1",
      groupId: "g1",
    })
    state = submitReducer(state, {
      type: "ADD_ROW",
      buttonType: "assembled",
      entryId: "e2",
      groupId: "g2",
    })
    state = submitReducer(state, {
      type: "COMMIT_ROW_EDIT",
      entryId: "e1",
      patch: { groupType: "pair-end", dataForm: "raw", chipTags: [] },
    })
    const { configured, total } = countConfiguredRows(state)
    expect(total).toBe(2)
    expect(configured).toBe(1)
  })

  test("selectRowDetailSummary_emptyConfigured_returnsEmpty", () => {
    const state = submitReducer(initialState, {
      type: "ADD_ROW",
      buttonType: "sequence-read",
      entryId: "e1",
      groupId: "g1",
    })
    expect(selectRowDetailSummary(state, "e1")).toBe("")
  })

  test("selectRowDetailSummary_groupTypeAndChip_joinsWithSeparator", () => {
    const seeded = submitReducer(initialState, {
      type: "ADD_ROW",
      buttonType: "sequence-read",
      entryId: "e1",
      groupId: "g1",
    })
    const state = submitReducer(seeded, {
      type: "COMMIT_ROW_EDIT",
      entryId: "e1",
      patch: {
        groupType: "pair-end",
        dataForm: "raw",
        chipTags: [{ axis: "provenance", value: "third-party" }],
      },
    })
    const summary = selectRowDetailSummary(state, "e1")
    expect(summary).toContain("pair-end")
    expect(summary).toContain("provenance:third-party")
    expect(summary).toContain(" · ")
  })
})
