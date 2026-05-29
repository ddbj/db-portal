import { describe, expect, test } from "vitest"

import { FlowStep, FlowStepNote, FlowStepScope } from "../../../../app/schemas/submit"

describe("FlowStep", () => {
  test("FlowStep_validInput_parses", () => {
    const parsed = FlowStep.parse({
      id: "tier1-dra",
      service: "dra",
      origin: "tier1",
      scope: { groupIds: ["g1"], entryIds: ["e1"] },
      notes: [{ kind: "info", messageKey: "submit.sequenceRead.dra.intro" }],
    })
    expect(parsed.service).toBe("dra")
    expect(parsed.origin).toBe("tier1")
    expect(parsed.notes[0]!.kind).toBe("info")
  })

  test("FlowStep_notesOmitted_defaultsToEmpty", () => {
    const parsed = FlowStep.parse({
      id: "tier2-biosample",
      service: "biosample",
      origin: "tier2",
      scope: { groupIds: ["g1"], entryIds: ["e1"] },
    })
    expect(parsed.notes).toEqual([])
  })

  test("FlowStep_originOmitted_throws", () => {
    expect(() =>
      FlowStep.parse({
        id: "x",
        service: "dra",
        scope: { groupIds: [], entryIds: ["e1"] },
      }),
    ).toThrow()
  })

  test("FlowStep_unknownOrigin_throws", () => {
    expect(() =>
      FlowStep.parse({
        id: "x",
        service: "dra",
        origin: "manual",
        scope: { groupIds: [], entryIds: ["e1"] },
      }),
    ).toThrow()
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
        origin: "tier1",
        scope: { groupIds: ["g1"], entryIds: [] },
        notes: [],
      }),
    ).toThrow()
  })
})
