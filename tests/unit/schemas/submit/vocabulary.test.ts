import { describe, expect, test } from "vitest"

import {
  Access,
  ALLOWED_CHIP_VALUES,
  ChipAxis,
  DataForm,
  FileTypeKind,
  GroupType,
  isAllowedChipValue,
  Q1,
  Q2,
  TYPICAL_DATA_FORM_FOR_KIND,
  TYPICAL_GROUP_TYPE_FOR_KIND,
} from "../../../../app/schemas/submit"

describe("vocabulary enum option counts", () => {
  test("FileTypeKind_hasElevenOptions", () => {
    expect(FileTypeKind.options).toHaveLength(11)
  })

  test("FileTypeKind_optionsAreUnique", () => {
    expect(new Set(FileTypeKind.options).size).toBe(FileTypeKind.options.length)
  })

  test("Q1_hasThreeOptions", () => {
    expect(Q1.options).toHaveLength(3)
  })

  test("Q2_hasFiveOptions", () => {
    expect(Q2.options).toHaveLength(5)
  })

  test("GroupType_hasThirteenOptions", () => {
    expect(GroupType.options).toHaveLength(13)
  })

  test("GroupType_optionsAreUnique", () => {
    expect(new Set(GroupType.options).size).toBe(GroupType.options.length)
  })

  test("Access_hasTwoOptions", () => {
    expect(Access.options).toEqual(["open", "restricted"])
  })

  test("DataForm_hasEightOptions", () => {
    expect(DataForm.options).toHaveLength(8)
  })

  test("ChipAxis_hasThreeOptions", () => {
    expect(ChipAxis.options).toHaveLength(3)
  })
})

describe("vocabulary enum parsing", () => {
  test.each(FileTypeKind.options)("FileTypeKind_parse_%s_returnsSameValue", (kind) => {
    expect(FileTypeKind.parse(kind)).toBe(kind)
  })

  test("FileTypeKind_parse_unknown_throws", () => {
    expect(() => FileTypeKind.parse("unknown")).toThrow()
  })

  test("FileTypeKind_parse_emptyString_throws", () => {
    expect(() => FileTypeKind.parse("")).toThrow()
  })

  test.each(Q1.options)("Q1_parse_%s_returnsSameValue", (q1) => {
    expect(Q1.parse(q1)).toBe(q1)
  })

  test("Q1_parse_unknown_throws", () => {
    expect(() => Q1.parse("private")).toThrow()
  })

  test.each(Q2.options)("Q2_parse_%s_returnsSameValue", (q2) => {
    expect(Q2.parse(q2)).toBe(q2)
  })

  test("Q2_parse_unknown_throws", () => {
    expect(() => Q2.parse("animal")).toThrow()
  })

  test.each(GroupType.options)("GroupType_parse_%s_returnsSameValue", (gt) => {
    expect(GroupType.parse(gt)).toBe(gt)
  })

  test("GroupType_parse_unknown_throws", () => {
    expect(() => GroupType.parse("triple-end")).toThrow()
  })

  test.each(Access.options)("Access_parse_%s_returnsSameValue", (a) => {
    expect(Access.parse(a)).toBe(a)
  })

  test("Access_parse_unknown_throws", () => {
    expect(() => Access.parse("controlled")).toThrow()
  })

  test.each(DataForm.options)("DataForm_parse_%s_returnsSameValue", (df) => {
    expect(DataForm.parse(df)).toBe(df)
  })

  test("DataForm_parse_unknown_throws", () => {
    expect(() => DataForm.parse("aligned")).toThrow()
  })

  test.each(ChipAxis.options)("ChipAxis_parse_%s_returnsSameValue", (axis) => {
    expect(ChipAxis.parse(axis)).toBe(axis)
  })

  test("ChipAxis_parse_unknown_throws", () => {
    expect(() => ChipAxis.parse("variation-form")).toThrow()
  })
})

describe("TYPICAL_DATA_FORM_FOR_KIND", () => {
  test.each(FileTypeKind.options)(
    "TYPICAL_DATA_FORM_FOR_KIND_%s_isDefinedAndInDataFormRange",
    (kind) => {
      const value = TYPICAL_DATA_FORM_FOR_KIND[kind]
      expect(value).toBeDefined()
      expect(DataForm.options).toContain(value)
    },
  )

  test("TYPICAL_DATA_FORM_FOR_KIND_coversExactlyAllFileTypeKinds", () => {
    expect(Object.keys(TYPICAL_DATA_FORM_FOR_KIND).sort()).toEqual(
      [...FileTypeKind.options].sort(),
    )
  })

  test("TYPICAL_DATA_FORM_FOR_KIND_hasNoKeyOutsideFileTypeKind", () => {
    for (const key of Object.keys(TYPICAL_DATA_FORM_FOR_KIND)) {
      expect(() => FileTypeKind.parse(key)).not.toThrow()
    }
  })
})

describe("TYPICAL_GROUP_TYPE_FOR_KIND", () => {
  test.each(FileTypeKind.options)(
    "TYPICAL_GROUP_TYPE_FOR_KIND_%s_isDefinedAndInGroupTypeRange",
    (kind) => {
      const value = TYPICAL_GROUP_TYPE_FOR_KIND[kind]
      expect(value).toBeDefined()
      expect(GroupType.options).toContain(value)
    },
  )

  test("TYPICAL_GROUP_TYPE_FOR_KIND_coversExactlyAllFileTypeKinds", () => {
    expect(Object.keys(TYPICAL_GROUP_TYPE_FOR_KIND).sort()).toEqual(
      [...FileTypeKind.options].sort(),
    )
  })

  test("TYPICAL_GROUP_TYPE_FOR_KIND_hasNoKeyOutsideFileTypeKind", () => {
    for (const key of Object.keys(TYPICAL_GROUP_TYPE_FOR_KIND)) {
      expect(() => FileTypeKind.parse(key)).not.toThrow()
    }
  })
})

describe("ALLOWED_CHIP_VALUES", () => {
  test.each(ChipAxis.options)(
    "ALLOWED_CHIP_VALUES_%s_isNonEmptyStringArray",
    (axis) => {
      const values = ALLOWED_CHIP_VALUES[axis]
      expect(Array.isArray(values)).toBe(true)
      expect(values.length).toBeGreaterThan(0)
      for (const v of values) {
        expect(typeof v).toBe("string")
        expect(v.length).toBeGreaterThan(0)
      }
    },
  )

  test("ALLOWED_CHIP_VALUES_coversExactlyAllChipAxes", () => {
    expect(Object.keys(ALLOWED_CHIP_VALUES).sort()).toEqual(
      [...ChipAxis.options].sort(),
    )
  })

  test.each(ChipAxis.options)(
    "ALLOWED_CHIP_VALUES_%s_hasNoDuplicateValues",
    (axis) => {
      const values = ALLOWED_CHIP_VALUES[axis]
      expect(new Set(values).size).toBe(values.length)
    },
  )
})

describe("isAllowedChipValue", () => {
  test.each(ChipAxis.options)(
    "isAllowedChipValue_%s_acceptsEveryListedValue",
    (axis) => {
      for (const v of ALLOWED_CHIP_VALUES[axis]) {
        expect(isAllowedChipValue(axis, v)).toBe(true)
      }
    },
  )

  test.each(ChipAxis.options)(
    "isAllowedChipValue_%s_rejectsUnknownValue",
    (axis) => {
      expect(isAllowedChipValue(axis, "__definitely_not_allowed__")).toBe(false)
    },
  )

  test.each(ChipAxis.options)(
    "isAllowedChipValue_%s_rejectsEmptyString",
    (axis) => {
      expect(isAllowedChipValue(axis, "")).toBe(false)
    },
  )

  test("isAllowedChipValue_valueFromAnotherAxis_rejected", () => {
    // "visium" は spatial-platform 専用で、他軸では許可されない
    expect(isAllowedChipValue("spatial-platform", "visium")).toBe(true)
    expect(isAllowedChipValue("mass-spec-domain", "visium")).toBe(false)
    expect(isAllowedChipValue("assembly-form", "visium")).toBe(false)
  })

  test("isAllowedChipValue_caseSensitive_rejectsWrongCase", () => {
    expect(isAllowedChipValue("assembly-form", "MAG")).toBe(false)
    expect(isAllowedChipValue("assembly-form", "mag")).toBe(true)
  })
})
