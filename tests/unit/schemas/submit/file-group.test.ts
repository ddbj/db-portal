import { describe, expect, test } from "vitest"

import { FileGroup } from "../../../../app/schemas/submit"

const validGroup = {
  id: "g1",
  groupType: "pair-end",
  memberFileIds: ["e1", "e2"],
  linkedGroupIds: ["g2"],
}

describe("FileGroup", () => {
  test("FileGroup_validInput_parses", () => {
    const parsed = FileGroup.parse(validGroup)
    expect(parsed.memberFileIds).toEqual(["e1", "e2"])
    expect(parsed.linkedGroupIds).toEqual(["g2"])
  })

  test("FileGroup_memberFileIdsOmitted_defaultsToEmpty", () => {
    const { memberFileIds: _omit, ...rest } = validGroup
    const parsed = FileGroup.parse(rest)
    expect(parsed.memberFileIds).toEqual([])
  })

  test("FileGroup_emptyId_throws", () => {
    expect(() => FileGroup.parse({ ...validGroup, id: "" })).toThrow()
  })

  test("FileGroup_unknownGroupType_throws", () => {
    expect(() => FileGroup.parse({ ...validGroup, groupType: "unknown" })).toThrow()
  })

  test("FileGroup_memberFileIdWithEmptyString_throws", () => {
    expect(() => FileGroup.parse({ ...validGroup, memberFileIds: [""] })).toThrow()
  })
})
