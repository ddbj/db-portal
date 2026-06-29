import { fc, test } from "@fast-check/vitest"
import { expect } from "vitest"

import {
  DEFAULT_URL_ACCESS_SECTION,
  readSubmitParams,
  type SubmitUrlState,
  type UrlEntry,
  type UrlGroup,
  writeSubmitParams,
} from "../../../app/lib/submit-url"
import {
  ALLOWED_CHIP_VALUES,
  type ChipAxis,
  ChipAxis as ChipAxisEnum,
  DataForm,
  FileTypeKind,
  GroupType,
  OrganismDomain,
} from "../../../app/schemas/submit"
import { arbAccessSection } from "../arbitraries/submission"

const arbOrganismDomainOrNull = fc.option(fc.constantFrom(...OrganismDomain.options), { nil: null })
const arbFileTypeKind = fc.constantFrom(...FileTypeKind.options)
const arbDataFormOrNull = fc.option(fc.constantFrom(...DataForm.options), { nil: null })
const arbGroupType = fc.constantFrom(...GroupType.options)

const allowedChipPairs: readonly { axis: ChipAxis; value: string }[] = ChipAxisEnum.options.flatMap(
  (axis) => ALLOWED_CHIP_VALUES[axis].map((value) => ({ axis, value })),
)
const arbChipTag = fc.constantFrom(...allowedChipPairs)
const arbChipTagsByAxis: fc.Arbitrary<{ axis: ChipAxis; value: string }[]> = fc.uniqueArray(
  arbChipTag,
  { selector: (c) => c.axis, maxLength: ChipAxisEnum.options.length },
)

const arbAccessSectionOrNull = fc.option(arbAccessSection, { nil: null })

const arbState: fc.Arbitrary<SubmitUrlState> = fc
  .record({
    groupCount: fc.integer({ min: 0, max: 4 }),
    entryCount: fc.integer({ min: 0, max: 4 }),
  })
  .chain(({ groupCount, entryCount }) => {
    const arbGroup: fc.Arbitrary<UrlGroup> = fc.record({
      groupType: arbGroupType,
      memberEntryIndices: entryCount === 0
        ? fc.constant<number[]>([])
        : fc.uniqueArray(fc.integer({ min: 0, max: entryCount - 1 }), { maxLength: entryCount }),
      linkedGroupIndices: groupCount === 0
        ? fc.constant<number[]>([])
        : fc.uniqueArray(fc.integer({ min: 0, max: groupCount - 1 }), { maxLength: groupCount }),
    })
    const arbEntry: fc.Arbitrary<UrlEntry> = fc.record({
      fileTypeKind: arbFileTypeKind,
      dataForm: arbDataFormOrNull,
      groupIndex: groupCount === 0
        ? fc.constant<number | null>(null)
        : fc.option(fc.integer({ min: 0, max: groupCount - 1 }), { nil: null }),
      chipTags: arbChipTagsByAxis,
    })

    return fc.record({
      organismDomain: arbOrganismDomainOrNull,
      accessSection: arbAccessSectionOrNull,
      entries: fc.array(arbEntry, { minLength: entryCount, maxLength: entryCount }),
      groups: fc.array(arbGroup, { minLength: groupCount, maxLength: groupCount }),
    })
  })

// DEFAULT な accessSection は URL 上で省略され、再読み込み時に null として現れる。
// したがって round-trip では「DEFAULT 値の section」と「null」が等価扱いになる。
const normalizeForRoundTrip = (s: SubmitUrlState): SubmitUrlState => {
  if (s.accessSection === null) return s
  const isDefault = (Object.keys(DEFAULT_URL_ACCESS_SECTION) as (keyof typeof DEFAULT_URL_ACCESS_SECTION)[])
    .every((k) => s.accessSection![k] === DEFAULT_URL_ACCESS_SECTION[k])

  return isDefault ? { ...s, accessSection: null } : s
}

test.prop({ state: arbState })(
  "submit-url_roundTrip_returnsEquivalentState",
  ({ state }) => {
    const restored = readSubmitParams(writeSubmitParams(state))
    expect(restored).toEqual(normalizeForRoundTrip(state))
  },
)

test.prop({ state: arbState })(
  "writeSubmitParams_organismDomainKey_isAlwaysKebab",
  ({ state }) => {
    const params = writeSubmitParams(state)
    expect(params.has("organismDomain")).toBe(false)
    if (state.organismDomain !== null) {
      expect(params.get("organism-domain")).toBe(state.organismDomain)
    }
  },
)

test.prop({ state: arbState })(
  "writeSubmitParams_accessFlagValues_areAlwaysKebab",
  ({ state }) => {
    const params = writeSubmitParams(state)
    const access = params.get("access")
    if (access === null || access === "") return
    for (const token of access.split(",")) {
      expect(token).toMatch(/^[a-z]+(-[a-z]+)*$/)
    }
  },
)
