import { describe, expect, test } from "vitest"

import {
  Access,
  ALLOWED_CHIP_VALUES,
  ChipAxis,
  DataForm,
  FileTypeKind,
  GroupType,
  isAllowedChipValue,
  OrganismDomain,
  TYPICAL_DATA_FORM_FOR_KIND,
  TYPICAL_GROUP_TYPE_FOR_KIND,
} from "../../../../app/schemas/submit"

describe("vocabulary enum option invariants", () => {
  // Non-empty + unique are the real invariants (a duplicate or empty domain is a
  // bug); exact counts are change-detectors that fire on benign vocab growth.
  test.each<[string, readonly string[]]>([
    ["FileTypeKind", FileTypeKind.options],
    ["OrganismDomain", OrganismDomain.options],
    ["GroupType", GroupType.options],
    ["DataForm", DataForm.options],
    ["ChipAxis", ChipAxis.options],
  ])("%s_optionsAreNonEmptyAndUnique", (_name, options) => {
    expect(options.length).toBeGreaterThan(0)
    expect(new Set(options).size).toBe(options.length)
  })

  test("Access_hasExactlyOpenAndRestricted", () => {
    expect(Access.options).toEqual(["open", "restricted"])
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

  test.each(OrganismDomain.options)("OrganismDomain_parse_%s_returnsSameValue", (organismDomain) => {
    expect(OrganismDomain.parse(organismDomain)).toBe(organismDomain)
  })

  test("OrganismDomain_parse_unknown_throws", () => {
    expect(() => OrganismDomain.parse("animal")).toThrow()
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
    expect(isAllowedChipValue("tpa", "visium")).toBe(false)
    expect(isAllowedChipValue("assembly-form", "visium")).toBe(false)
  })

  test("isAllowedChipValue_caseSensitive_rejectsWrongCase", () => {
    expect(isAllowedChipValue("assembly-form", "MAG")).toBe(false)
    expect(isAllowedChipValue("assembly-form", "mag")).toBe(true)
  })
})
