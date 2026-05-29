import { fc, test } from "@fast-check/vitest"
import { expect } from "vitest"

import { initialState, submitReducer } from "../../../../app/features/submit/state/reducer"
import type { Action, UIState } from "../../../../app/features/submit/state/types"
import type { Access, FileTypeKind } from "../../../../app/schemas/submit"
import { arbAccess, arbFileTypeKind } from "../../arbitraries/submission"

const applySequence = (actions: readonly Action[]): UIState => {
  let state: UIState = initialState
  for (const action of actions) {
    state = submitReducer(state, action)
  }
  return state
}

type ActionStep =
  | { kind: "add"; fileTypeKind: FileTypeKind }
  | { kind: "add-to-group"; groupIdx: number; fileTypeKind: FileTypeKind }
  | { kind: "edit-access"; entryIdx: number; access: Access }
  | { kind: "remove"; entryIdx: number }
  | { kind: "close" }

const arbStep: fc.Arbitrary<ActionStep> = fc.oneof(
  fc.record({ kind: fc.constant("add" as const), fileTypeKind: arbFileTypeKind }),
  fc.record({
    kind: fc.constant("add-to-group" as const),
    groupIdx: fc.integer({ min: 0, max: 9 }),
    fileTypeKind: arbFileTypeKind,
  }),
  fc.record({
    kind: fc.constant("edit-access" as const),
    entryIdx: fc.integer({ min: 0, max: 9 }),
    access: arbAccess,
  }),
  fc.record({
    kind: fc.constant("remove" as const),
    entryIdx: fc.integer({ min: 0, max: 9 }),
  }),
  fc.record({ kind: fc.constant("close" as const) }),
)

// 各 step を、entry / group id を機械的に採番した実 Action 列へ変換する。
// ADD_ROW は新 group を、ADD_TO_GROUP は既存 group を指す。remove 後の空 group は
// reducer 側で drop されるため、ADD_TO_GROUP が消えた group を指す可能性は許容する (reducer は no-op)
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
      acts.push({ type: "ADD_ROW", fileTypeKind: step.fileTypeKind, entryId: eid, groupId: gid })
      knownEntryIds.push(eid)
      knownGroupIds.push(gid)
    } else if (step.kind === "add-to-group") {
      if (knownGroupIds.length === 0) continue
      const groupId = knownGroupIds[step.groupIdx % knownGroupIds.length]!
      const eid = `e${entryCounter++}`
      acts.push({ type: "ADD_TO_GROUP", groupId, fileTypeKind: step.fileTypeKind, entryId: eid })
      knownEntryIds.push(eid)
    } else if (step.kind === "edit-access") {
      if (knownEntryIds.length === 0) continue
      const id = knownEntryIds[step.entryIdx % knownEntryIds.length]!
      acts.push({ type: "EDIT_ROW_CELL", entryId: id, patch: { access: step.access } })
    } else if (step.kind === "remove") {
      if (knownEntryIds.length === 0) continue
      const idx = step.entryIdx % knownEntryIds.length
      const id = knownEntryIds[idx]!
      acts.push({ type: "REMOVE_ROW", entryId: id })
      knownEntryIds = knownEntryIds.filter((x) => x !== id)
    } else {
      acts.push({ type: "CLOSE_MODAL" })
    }
  }
  return acts
}

const arbActionSequence: fc.Arbitrary<Action[]> = fc
  .array(arbStep, { minLength: 0, maxLength: 12 })
  .map(stepsToActions)

const arbReachableState: fc.Arbitrary<UIState> = fc
  .array(arbFileTypeKind, { minLength: 0, maxLength: 6 })
  .map((kinds) => {
    let state: UIState = initialState
    kinds.forEach((kind, i) => {
      state = submitReducer(state, {
        type: "ADD_ROW",
        fileTypeKind: kind,
        entryId: `e${i}`,
        groupId: `g${i}`,
      })
    })
    return state
  })

test.prop([arbActionSequence], { numRuns: 1000 })(
  "submitReducer_anyActionSequence_entryGroupIdIsBidirectionallyReferenced",
  (actions) => {
    const state = applySequence(actions)
    const groupIds = new Set(state.submission.fileGroups.map((g) => g.id))
    for (const entry of state.submission.fileEntries) {
      expect(groupIds.has(entry.groupId)).toBe(true)
      const group = state.submission.fileGroups.find((g) => g.id === entry.groupId)
      expect(group).toBeDefined()
      expect(group!.memberFileIds).toContain(entry.id)
    }
  },
)

test.prop([arbActionSequence], { numRuns: 1000 })(
  "submitReducer_anyActionSequence_memberFileIdsReferenceExistingEntries",
  (actions) => {
    const state = applySequence(actions)
    const entryIds = new Set(state.submission.fileEntries.map((e) => e.id))
    for (const group of state.submission.fileGroups) {
      for (const memberId of group.memberFileIds) {
        expect(entryIds.has(memberId)).toBe(true)
      }
    }
  },
)

test.prop([arbActionSequence], { numRuns: 1000 })(
  "submitReducer_anyActionSequence_entryIdsUnique",
  (actions) => {
    const state = applySequence(actions)
    const ids = state.submission.fileEntries.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
  },
)

test.prop([arbActionSequence], { numRuns: 1000 })(
  "submitReducer_anyActionSequence_groupIdsUnique",
  (actions) => {
    const state = applySequence(actions)
    const ids = state.submission.fileGroups.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  },
)

test.prop([arbReachableState, arbFileTypeKind], { numRuns: 1000 })(
  "submitReducer_addRow_preservesFileTypeKindOnExistingEntries",
  (state, fileTypeKind) => {
    const before = state.submission.fileEntries.map((e) => ({ id: e.id, fileTypeKind: e.fileTypeKind }))
    const next = submitReducer(state, {
      type: "ADD_ROW",
      fileTypeKind,
      entryId: `new-${state.submission.fileEntries.length}`,
      groupId: `new-g-${state.submission.fileEntries.length}`,
    })
    for (const e of before) {
      const found = next.submission.fileEntries.find((x) => x.id === e.id)
      expect(found).toBeDefined()
      expect(found!.fileTypeKind).toBe(e.fileTypeKind)
    }
  },
)

test.prop([arbReachableState, arbFileTypeKind, arbAccess], {
  numRuns: 1000,
})(
  "submitReducer_editRowCell_cannotHijackFileTypeKindOrId",
  (state, hijackKind, newAccess) => {
    if (state.submission.fileEntries.length === 0) return
    const target = state.submission.fileEntries[0]!
    const next = submitReducer(state, {
      type: "EDIT_ROW_CELL",
      entryId: target.id,
      patch: {
        id: "hijacked",
        fileTypeKind: hijackKind,
        groupId: "hijacked-group",
        access: newAccess,
      },
    })
    const updated = next.submission.fileEntries.find((e) => e.id === target.id)
    expect(updated).toBeDefined()
    expect(updated!.id).toBe(target.id)
    expect(updated!.fileTypeKind).toBe(target.fileTypeKind)
    expect(updated!.groupId).toBe(target.groupId)
    // benign フィールドは反映される
    expect(updated!.access).toBe(newAccess)
    // hijack id を持つ entry が生成されていない
    expect(next.submission.fileEntries.some((e) => e.id === "hijacked")).toBe(false)
  },
)
