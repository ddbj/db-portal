import { describe, expect, test } from "vitest"

import { Submission } from "../../../../app/schemas/submit"

describe("Submission", () => {
  test("Submission_emptyObject_yieldsDefaults", () => {
    const parsed = Submission.parse({})
    expect(parsed.fileEntries).toEqual([])
    expect(parsed.fileGroups).toEqual([])
    expect(parsed.notes).toBe("")
  })

  test("Submission_withEntriesAndGroups_parses", () => {
    const parsed = Submission.parse({
      fileEntries: [{
        id: "e1",
        buttonType: "sequence-read",
        organism: "human",
        access: "restricted",
        dataForm: "raw",
        groupId: "g1",
        chipTags: [],
      }],
      fileGroups: [{
        id: "g1",
        groupType: "single",
        memberFileIds: ["e1"],
        linkedGroupIds: [],
      }],
      notes: "memo",
    })
    expect(parsed.fileEntries).toHaveLength(1)
    expect(parsed.fileGroups[0]!.memberFileIds).toEqual(["e1"])
    expect(parsed.notes).toBe("memo")
  })

  test("Submission_invalidEntry_throws", () => {
    expect(() =>
      Submission.parse({
        fileEntries: [{ id: "e1", buttonType: "bad" }],
      }),
    ).toThrow()
  })
})
