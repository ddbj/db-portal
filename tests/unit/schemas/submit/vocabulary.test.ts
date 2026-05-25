import { describe, expect, test } from "vitest"

import {
  Access,
  ALLOWED_CHIP_VALUES,
  ButtonType,
  ChipAxis,
  DataForm,
  EXTERNAL_SERVICES,
  GroupType,
  INTERNAL_SERVICES,
  isAllowedChipValue,
  Organism,
  Service,
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

  test.each(Service.options)(
    "Service_%s_isCoveredByExactlyOneOfInternalOrExternal",
    (s) => {
      const isInternal = (INTERNAL_SERVICES as readonly typeof s[]).includes(s)
      const isExternal = (EXTERNAL_SERVICES as readonly typeof s[]).includes(s)
      expect(isInternal !== isExternal).toBe(true)
    },
  )

  test("ALLOWED_CHIP_VALUES_coversAllChipAxes", () => {
    for (const axis of ChipAxis.options) {
      expect(ALLOWED_CHIP_VALUES[axis]).toBeDefined()
      expect(Array.isArray(ALLOWED_CHIP_VALUES[axis])).toBe(true)
    }
  })

  test("ALLOWED_CHIP_VALUES_yieldsUniqueValuesPerAxis", () => {
    for (const axis of ChipAxis.options) {
      const values = ALLOWED_CHIP_VALUES[axis]
      expect(new Set(values).size).toBe(values.length)
    }
  })

  test.each(ChipAxis.options)(
    "isAllowedChipValue_%s_acceptsListedAndRejectsUnknown",
    (axis) => {
      for (const v of ALLOWED_CHIP_VALUES[axis]) {
        expect(isAllowedChipValue(axis, v)).toBe(true)
      }
      expect(isAllowedChipValue(axis, "__definitely_not_allowed__")).toBe(false)
    },
  )
})
