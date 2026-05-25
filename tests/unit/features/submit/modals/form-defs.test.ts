import { describe, expect, test } from "vitest"

import { ROW_FORM_DEFS } from "../../../../../app/features/submit/modals/form-defs"
import { ALLOWED_CHIP_VALUES, ButtonType } from "../../../../../app/schemas/submit"

describe("ROW_FORM_DEFS", () => {
  test("formDefs_coverAllButtonTypes", () => {
    for (const bt of ButtonType.options) {
      expect(ROW_FORM_DEFS[bt]).toBeDefined()
      expect(ROW_FORM_DEFS[bt]!.groups.length).toBeGreaterThan(0)
    }
  })

  test("formDefs_eachOptionHasEffect", () => {
    for (const bt of ButtonType.options) {
      const def = ROW_FORM_DEFS[bt]!
      for (const group of def.groups) {
        for (const opt of group.options) {
          // 効果が完全に空のオプションは無効 (radio で「何も変えない」 のは UX 上意味がない)
          const hasEffect = opt.effect.groupType !== undefined
            || opt.effect.dataForm !== undefined
            || opt.effect.chipAdd !== undefined
            || opt.effect.chipRemoveAxis !== undefined
          expect(hasEffect).toBe(true)
        }
      }
    }
  })

  test("formDefs_optionValuesUniqueWithinGroup", () => {
    for (const bt of ButtonType.options) {
      const def = ROW_FORM_DEFS[bt]!
      for (const group of def.groups) {
        const values = group.options.map((o) => o.value)
        expect(new Set(values).size).toBe(values.length)
      }
    }
  })

  test("formDefs_chipAddEffectsAreInAllowedChipValues", () => {
    const violations: string[] = []
    for (const bt of ButtonType.options) {
      const def = ROW_FORM_DEFS[bt]!
      for (const group of def.groups) {
        for (const opt of group.options) {
          const chipAdd = opt.effect.chipAdd
          if (chipAdd === undefined) continue
          if (!ALLOWED_CHIP_VALUES[chipAdd.axis].includes(chipAdd.value)) {
            violations.push(`${bt}/${group.id}/${opt.value} -> ${chipAdd.axis}:${chipAdd.value}`)
          }
        }
      }
    }
    expect(violations).toEqual([])
  })
})
