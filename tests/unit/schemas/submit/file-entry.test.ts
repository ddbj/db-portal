import { describe, expect, test } from "vitest"

import { FileEntry } from "../../../../app/schemas/submit"

const validEntry = {
  id: "e1",
  buttonType: "sequence-read",
  organism: "human",
  access: "restricted",
  dataForm: "raw",
  groupId: "g1",
  chipTags: [{ axis: "provenance", value: "third-party" }],
}

describe("FileEntry", () => {
  test("FileEntry_validInput_parses", () => {
    const parsed = FileEntry.parse(validEntry)
    expect(parsed.id).toBe("e1")
    expect(parsed.chipTags).toHaveLength(1)
  })

  test("FileEntry_chipTagsOmitted_defaultsToEmptyArray", () => {
    const { chipTags: _omit, ...rest } = validEntry
    const parsed = FileEntry.parse(rest)
    expect(parsed.chipTags).toEqual([])
  })

  test("FileEntry_emptyId_throws", () => {
    expect(() => FileEntry.parse({ ...validEntry, id: "" })).toThrow()
  })

  test("FileEntry_unknownButtonType_throws", () => {
    expect(() => FileEntry.parse({ ...validEntry, buttonType: "unknown" })).toThrow()
  })

  test("FileEntry_invalidChipAxis_throws", () => {
    expect(() =>
      FileEntry.parse({
        ...validEntry,
        chipTags: [{ axis: "unknown-axis", value: "x" }],
      }),
    ).toThrow()
  })

  test("FileEntry_chipValueEmpty_throws", () => {
    expect(() =>
      FileEntry.parse({
        ...validEntry,
        chipTags: [{ axis: "provenance", value: "" }],
      }),
    ).toThrow()
  })

  test("FileEntry_groupIdEmpty_throws", () => {
    expect(() => FileEntry.parse({ ...validEntry, groupId: "" })).toThrow()
  })
})
