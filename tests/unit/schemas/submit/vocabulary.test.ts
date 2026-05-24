import { describe, expect, test } from "vitest"

import {
  Access,
  ButtonType,
  ChipAxis,
  DataForm,
  GroupType,
  Organism,
  TYPICAL_DATA_FORM_FOR_BUTTON,
  TYPICAL_GROUP_TYPE_FOR_BUTTON,
} from "../../../../app/schemas/submit"

describe("vocabulary enums", () => {
  test("ButtonType_validValue_parses", () => {
    expect(ButtonType.parse("sequence-read")).toBe("sequence-read")
    expect(ButtonType.options).toHaveLength(9)
  })

  test("ButtonType_unknownValue_throws", () => {
    expect(() => ButtonType.parse("unknown")).toThrow()
  })

  test("GroupType_thirteenOptions", () => {
    expect(GroupType.options).toHaveLength(13)
    expect(GroupType.parse("pair-end")).toBe("pair-end")
  })

  test("Organism_sevenOptions", () => {
    expect(Organism.options).toHaveLength(7)
    expect(Organism.parse("human")).toBe("human")
  })

  test("Access_openOrRestricted", () => {
    expect(Access.options).toEqual(["open", "restricted"])
  })

  test("DataForm_sevenOptions", () => {
    expect(DataForm.options).toHaveLength(7)
  })

  test("ChipAxis_tenAxes", () => {
    expect(ChipAxis.options).toHaveLength(10)
  })

  test("TYPICAL_DATA_FORM_FOR_BUTTON_coversAllButtonTypes", () => {
    for (const bt of ButtonType.options) {
      expect(TYPICAL_DATA_FORM_FOR_BUTTON[bt]).toBeDefined()
      expect(DataForm.options).toContain(TYPICAL_DATA_FORM_FOR_BUTTON[bt])
    }
  })

  test("TYPICAL_GROUP_TYPE_FOR_BUTTON_coversAllButtonTypes", () => {
    for (const bt of ButtonType.options) {
      expect(TYPICAL_GROUP_TYPE_FOR_BUTTON[bt]).toBeDefined()
      expect(GroupType.options).toContain(TYPICAL_GROUP_TYPE_FOR_BUTTON[bt])
    }
  })
})
