import { describe, expect, test } from "vitest"

import { Submission } from "../../../../app/schemas/submit"

describe("Submission", () => {
  test("Submission_emptyObject_yieldsDefaults", () => {
    const parsed = Submission.parse({})
    expect(parsed.preconditions).toEqual({ q2: null })
    expect(parsed.accessSection).toEqual({
      restrictedPreference: false,
      hasIdentifier: false,
      ethicsCompliance: true,
      publiclyAvailable: false,
      microbialAnalysis: false,
    })
    expect(parsed.fileEntries).toEqual([])
    expect(parsed.fileGroups).toEqual([])
    expect(parsed.notes).toBe("")
  })

  test("Submission_withPreconditionsEntriesAndGroups_parses", () => {
    const parsed = Submission.parse({
      preconditions: { q2: "human" },
      accessSection: { restrictedPreference: true },
      fileEntries: [{
        id: "e1",
        fileTypeKind: "sequence-read",
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
    expect(parsed.preconditions.q2).toBe("human")
    expect(parsed.accessSection.restrictedPreference).toBe(true)
    expect(parsed.fileEntries).toHaveLength(1)
    expect(parsed.fileGroups[0]!.memberFileIds).toEqual(["e1"])
    expect(parsed.notes).toBe("memo")
  })

  test("Submission_invalidEntry_throws", () => {
    expect(() =>
      Submission.parse({
        fileEntries: [{ id: "e1", fileTypeKind: "bad" }],
      }),
    ).toThrow()
  })

  test("Submission_unknownQ2_throws", () => {
    expect(() =>
      Submission.parse({ preconditions: { q2: "animal" } }),
    ).toThrow()
  })
})
