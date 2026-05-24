import { describe, expect, test } from "vitest"

import { FlowStep, FlowStepNote, FlowStepScope } from "../../../../app/schemas/submit"

describe("FlowStep", () => {
  test("FlowStep_validInput_parses", () => {
    const parsed = FlowStep.parse({
      id: "dra",
      service: "dra",
      scope: { groupIds: ["g1"], entryIds: ["e1"] },
      notes: [{ kind: "info", messageKey: "submit.dra.intro" }],
    })
    expect(parsed.service).toBe("dra")
    expect(parsed.notes[0]!.kind).toBe("info")
  })

  test("FlowStep_notesOmitted_defaultsToEmpty", () => {
    const parsed = FlowStep.parse({
      id: "biosample:human",
      service: "biosample",
      scope: { groupIds: ["g1"], entryIds: ["e1"] },
    })
    expect(parsed.notes).toEqual([])
  })

  test("FlowStepScope_emptyArrays_parses", () => {
    const parsed = FlowStepScope.parse({ groupIds: [], entryIds: [] })
    expect(parsed.groupIds).toEqual([])
  })

  test("FlowStepNote_unknownKind_throws", () => {
    expect(() => FlowStepNote.parse({ kind: "debug", messageKey: "x" })).toThrow()
  })

  test("FlowStepNote_emptyMessageKey_throws", () => {
    expect(() => FlowStepNote.parse({ kind: "info", messageKey: "" })).toThrow()
  })

  test("FlowStep_unknownService_throws", () => {
    expect(() =>
      FlowStep.parse({
        id: "x",
        service: "unknown",
        scope: { groupIds: ["g1"], entryIds: [] },
        notes: [],
      }),
    ).toThrow()
  })
})
