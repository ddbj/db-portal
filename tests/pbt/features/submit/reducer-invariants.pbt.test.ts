import { fc, test } from "@fast-check/vitest"
import { expect } from "vitest"

import { initialState, submitReducer } from "../../../../app/features/submit/state/reducer"
import type { Action, UIState } from "../../../../app/features/submit/state/types"
import type { ButtonType } from "../../../../app/schemas/submit"

const buttonTypes: readonly ButtonType[] = [
  "sequence-read",
  "assembled",
  "gene-annotation",
  "variation",
  "phenotype",
  "microarray-expression",
  "rna-seq-matrix",
  "mass-spec",
  "spatial-tx",
]

const arbButtonType = fc.constantFrom(...buttonTypes)

const applySequence = (actions: readonly Action[]): UIState => {
  let state: UIState = initialState
  for (const action of actions) {
    state = submitReducer(state, action)
  }
  return state
}

type ActionStep =
  | { kind: "add"; bt: ButtonType }
  | { kind: "add-to-group"; groupIdx: number; bt: ButtonType }
  | { kind: "edit-filename"; entryIdx: number; filename: string }
  | { kind: "remove"; entryIdx: number }
  | { kind: "close" }

const arbStep: fc.Arbitrary<ActionStep> = fc.oneof(
  fc.record({ kind: fc.constant("add" as const), bt: arbButtonType }),
  fc.record({
    kind: fc.constant("add-to-group" as const),
    groupIdx: fc.integer({ min: 0, max: 9 }),
    bt: arbButtonType,
  }),
  fc.record({
    kind: fc.constant("edit-filename" as const),
    entryIdx: fc.integer({ min: 0, max: 9 }),
    filename: fc.string({ minLength: 0, maxLength: 24 }),
  }),
  fc.record({
    kind: fc.constant("remove" as const),
    entryIdx: fc.integer({ min: 0, max: 9 }),
  }),
  fc.record({ kind: fc.constant("close" as const) }),
)

const stepsToActions = (steps: readonly ActionStep[]): Action[] => {
  const acts: Action[] = []
  let entryCounter = 0
  let groupCounter = 0
  let knownEntryIds: string[] = []
  const knownGroupIds: string[] = []
  for (const step of steps) {
    if (step.kind === "add") {
      const eid = `e${entryCounter++}`
      const gid = `g${groupCounter++}`
      acts.push({ type: "ADD_ROW", buttonType: step.bt, entryId: eid, groupId: gid })
      knownEntryIds.push(eid)
      knownGroupIds.push(gid)
    } else if (step.kind === "add-to-group") {
      if (knownGroupIds.length === 0) continue
      const groupId = knownGroupIds[step.groupIdx % knownGroupIds.length]!
      const eid = `e${entryCounter++}`
      acts.push({ type: "ADD_TO_GROUP", groupId, buttonType: step.bt, entryId: eid })
      knownEntryIds.push(eid)
    } else if (step.kind === "edit-filename") {
      if (knownEntryIds.length === 0) continue
      const id = knownEntryIds[step.entryIdx % knownEntryIds.length]!
      acts.push({ type: "EDIT_ROW_CELL", entryId: id, patch: { filename: step.filename } })
    } else if (step.kind === "remove") {
      if (knownEntryIds.length === 0) continue
      const idx = step.entryIdx % knownEntryIds.length
      const id = knownEntryIds[idx]!
      acts.push({ type: "REMOVE_ROW", entryId: id })
      knownEntryIds = knownEntryIds.filter((x) => x !== id)
      // 削除で empty group になった場合は reducer 側で group も削除される。 arb 側では追跡せず、 ADD_TO_GROUP は不存在 group を指す可能性を許容 (reducer は no-op)
    } else {
      acts.push({ type: "CLOSE_MODAL" })
    }
  }
  return acts
}

const arbActionSequence: fc.Arbitrary<Action[]> = fc
  .array(arbStep, { minLength: 0, maxLength: 10 })
  .map(stepsToActions)

const arbReachableState: fc.Arbitrary<UIState> = fc.array(arbButtonType, { minLength: 0, maxLength: 5 }).map(
  (bts) => {
    let state: UIState = initialState
    bts.forEach((bt, i) => {
      state = submitReducer(state, { type: "ADD_ROW", buttonType: bt, entryId: `e${i}`, groupId: `g${i}` })
    })
    return state
  },
)

test.prop([arbActionSequence], { numRuns: 200 })(
  "submitReducer_anyActionSequence_groupIdsAreReferenced",
  (actions) => {
    const state = applySequence(actions)
    const groupIds = new Set(state.submission.fileGroups.map((g) => g.id))
    for (const entry of state.submission.fileEntries) {
      // 本テストの arb はすべて既存 group / 新規 group を指す ADD_ROW / ADD_TO_GROUP しか発火しないので、 entry.groupId は必ず submission.fileGroups に存在する
      expect(groupIds.has(entry.groupId)).toBe(true)
      // 双方向: 参照先 group の memberFileIds に entry が含まれる
      const matching = state.submission.fileGroups.find((g) => g.id === entry.groupId)
      expect(matching).toBeDefined()
      expect(matching!.memberFileIds).toContain(entry.id)
    }
  },
)

test.prop([arbActionSequence], { numRuns: 200 })(
  "submitReducer_anyActionSequence_memberFileIdsReferenceExistingEntries",
  (actions) => {
    const state = applySequence(actions)
    const entryIds = new Set(state.submission.fileEntries.map((e) => e.id))
    for (const group of state.submission.fileGroups) {
      // group の memberFileIds は必ず submission.fileEntries に存在する entry を指す
      for (const memberId of group.memberFileIds) {
        expect(entryIds.has(memberId)).toBe(true)
      }
    }
  },
)

test.prop([arbActionSequence], { numRuns: 200 })(
  "submitReducer_anyActionSequence_entryIdsUnique",
  (actions) => {
    const state = applySequence(actions)
    const ids = state.submission.fileEntries.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  },
)

test.prop([arbActionSequence], { numRuns: 200 })(
  "submitReducer_anyActionSequence_groupIdsUnique",
  (actions) => {
    const state = applySequence(actions)
    const ids = state.submission.fileGroups.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  },
)

test.prop([arbReachableState, arbButtonType], { numRuns: 200 })(
  "submitReducer_addRow_preservesButtonTypeOnExistingEntries",
  (state, bt) => {
    const before = state.submission.fileEntries.map((e) => ({ id: e.id, buttonType: e.buttonType }))
    const next = submitReducer(state, {
      type: "ADD_ROW",
      buttonType: bt,
      entryId: `new-${state.submission.fileEntries.length}`,
      groupId: `new-g-${state.submission.fileEntries.length}`,
    })
    for (const e of before) {
      const found = next.submission.fileEntries.find((x) => x.id === e.id)
      expect(found).toBeDefined()
      expect(found!.buttonType).toBe(e.buttonType)
    }
  },
)

test.prop([arbReachableState], { numRuns: 200 })(
  "submitReducer_arbReachableState_editRowCellDoesNotChangeButtonTypeOrId",
  (state) => {
    if (state.submission.fileEntries.length === 0) return
    const target = state.submission.fileEntries[0]!
    const next = submitReducer(state, {
      type: "EDIT_ROW_CELL",
      entryId: target.id,
      patch: {
        // hijack を試みる
        id: "hijacked",
        buttonType: "variation",
        filename: "patched",
      },
    })
    const updated = next.submission.fileEntries.find((e) => e.id === target.id)
    expect(updated).toBeDefined()
    expect(updated!.buttonType).toBe(target.buttonType)
    expect(updated!.filename).toBe("patched")
  },
)
