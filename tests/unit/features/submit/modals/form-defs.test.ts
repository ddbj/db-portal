import { describe, expect, test } from "vitest"

import { ROW_FORM_DEFS } from "../../../../../app/features/submit/modals/form-defs"
import {
  ChipAxis,
  DataForm,
  FileTypeKind,
  GroupType,
  isAllowedChipValue,
} from "../../../../../app/schemas/submit"

const ALL_KINDS = FileTypeKind.options
const KEYS = Object.keys(ROW_FORM_DEFS) as FileTypeKind[]

const allEffects = () =>
  KEYS.flatMap((kind) =>
    ROW_FORM_DEFS[kind].groups.flatMap((group) =>
      group.options.map((option) => ({
        kind,
        groupId: group.id,
        value: option.value,
        effect: option.effect,
      })),
    ),
  )

describe("ROW_FORM_DEFS_kindCoverage", () => {
  test("ROW_FORM_DEFS_keys_coverAllElevenFileTypeKinds", () => {
    expect(new Set(KEYS)).toStrictEqual(new Set(ALL_KINDS))
    expect(KEYS).toHaveLength(11)
  })

  test("ROW_FORM_DEFS_keys_containNoExtraKinds", () => {
    const allowed = new Set<string>(ALL_KINDS)
    for (const key of KEYS) {
      expect(allowed.has(key)).toBe(true)
    }
  })

  test.each(ALL_KINDS)("ROW_FORM_DEFS_kind_%s_isPresent", (kind) => {
    expect(ROW_FORM_DEFS[kind]).toBeDefined()
  })
})

describe("ROW_FORM_DEFS_groupStructure", () => {
  test("ROW_FORM_DEFS_everyKind_hasAtLeastOneGroup", () => {
    for (const kind of KEYS) {
      expect(ROW_FORM_DEFS[kind].groups.length).toBeGreaterThan(0)
    }
  })

  test("ROW_FORM_DEFS_everyGroup_hasNonEmptyOptions", () => {
    const empty: string[] = []
    for (const kind of KEYS) {
      for (const group of ROW_FORM_DEFS[kind].groups) {
        if (group.options.length === 0) {
          empty.push(`${kind}/${group.id}`)
        }
      }
    }
    expect(empty).toStrictEqual([])
  })
})

describe("ROW_FORM_DEFS_effectVocabulary", () => {
  test("ROW_FORM_DEFS_everyEffectGroupType_isValidGroupType", () => {
    const invalid: string[] = []
    for (const { kind, groupId, value, effect } of allEffects()) {
      if (effect.groupType === undefined) continue
      if (!GroupType.safeParse(effect.groupType).success) {
        invalid.push(`${kind}/${groupId}/${value}=${effect.groupType}`)
      }
    }
    expect(invalid).toStrictEqual([])
  })

  test("ROW_FORM_DEFS_everyEffectDataForm_isValidDataForm", () => {
    const invalid: string[] = []
    for (const { kind, groupId, value, effect } of allEffects()) {
      if (effect.dataForm === undefined) continue
      if (!DataForm.safeParse(effect.dataForm).success) {
        invalid.push(`${kind}/${groupId}/${value}=${effect.dataForm}`)
      }
    }
    expect(invalid).toStrictEqual([])
  })

  test("ROW_FORM_DEFS_everyChipRemoveAxis_isValidChipAxis", () => {
    const invalid: string[] = []
    for (const { kind, groupId, value, effect } of allEffects()) {
      if (effect.chipRemoveAxis === undefined) continue
      if (!ChipAxis.safeParse(effect.chipRemoveAxis).success) {
        invalid.push(`${kind}/${groupId}/${value}=${effect.chipRemoveAxis}`)
      }
    }
    expect(invalid).toStrictEqual([])
  })
})

describe("ROW_FORM_DEFS_chipAddConsistency", () => {
  test("ROW_FORM_DEFS_everyChipAddAxis_isValidChipAxis", () => {
    const invalid: string[] = []
    for (const { kind, groupId, value, effect } of allEffects()) {
      if (effect.chipAdd === undefined) continue
      if (!ChipAxis.safeParse(effect.chipAdd.axis).success) {
        invalid.push(`${kind}/${groupId}/${value}=${effect.chipAdd.axis}`)
      }
    }
    expect(invalid).toStrictEqual([])
  })

  test("ROW_FORM_DEFS_everyChipAddValue_isAllowedForItsAxis", () => {
    const invalid: string[] = []
    for (const { kind, groupId, value, effect } of allEffects()) {
      if (effect.chipAdd === undefined) continue
      const axisOk = ChipAxis.safeParse(effect.chipAdd.axis).success
      if (!axisOk) continue
      if (!isAllowedChipValue(effect.chipAdd.axis, effect.chipAdd.value)) {
        invalid.push(
          `${kind}/${groupId}/${value}: ${effect.chipAdd.axis}=${effect.chipAdd.value}`,
        )
      }
    }
    expect(invalid).toStrictEqual([])
  })

  test("ROW_FORM_DEFS_chipAdd_rejectsValueFromWrongAxis", () => {
    const spatial = ROW_FORM_DEFS["spatial-transcriptomics"].groups
      .flatMap((g) => g.options)
      .map((o) => o.effect.chipAdd)
      .find((c) => c !== undefined)
    expect(spatial).toBeDefined()
    expect(isAllowedChipValue(spatial!.axis, spatial!.value)).toBe(true)
    expect(isAllowedChipValue("mass-spec-domain", spatial!.value)).toBe(false)
  })
})
