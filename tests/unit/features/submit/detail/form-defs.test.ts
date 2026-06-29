import { describe, expect, test } from "vitest"

import type { FormOptionEffect } from "../../../../../app/features/submit/detail/form-defs"
import { getRowFormDef, hasRowDetail } from "../../../../../app/features/submit/detail/form-defs"
import {
  ChipAxis,
  DataForm,
  FileTypeKind,
  GroupType,
  isAllowedChipValue,
  OrganismDomain,
} from "../../../../../app/schemas/submit"

const ALL_KINDS = FileTypeKind.options
const ALL_OrganismDomainS: (OrganismDomain | null)[] = [null, ...OrganismDomain.options]

const allEffects = (organismDomain: OrganismDomain | null, hasIdentifier = true) =>
  ALL_KINDS.flatMap((kind) =>
    getRowFormDef(kind, organismDomain, hasIdentifier).groups.flatMap((group) =>
      group.options.map((option) => ({
        kind,
        groupId: group.id,
        value: option.value,
        effect: option.effect,
      })),
    ),
  )

describe("getRowFormDef_kindCoverage", () => {
  test("getRowFormDef_returnsDefForAllKinds", () => {
    for (const kind of ALL_KINDS) {
      expect(getRowFormDef(kind, null, true)).toBeDefined()
    }
  })
})

const BASE_DETAIL_KINDS = new Set<FileTypeKind>([
  "sequence",
  "expression-matrix",
  "spatial-transcriptomics",
])

const IDENTIFIABLE_KINDS = new Set<FileTypeKind>([
  "sequence-read",
  "sequence",
  "variant",
])

describe("getRowFormDef_groupStructure", () => {
  test("nonHumanOrganismDomain_onlyBaseFlowChangingKindsHaveGroups", () => {
    for (const kind of ALL_KINDS) {
      expect(getRowFormDef(kind, null, true).groups.length > 0).toBe(BASE_DETAIL_KINDS.has(kind))
    }
  })

  test("humanOrganismDomain_identifiableKindsAlsoHaveGroups", () => {
    for (const kind of ALL_KINDS) {
      const hasGroups = getRowFormDef(kind, "human", true).groups.length > 0
      const expected = BASE_DETAIL_KINDS.has(kind) || IDENTIFIABLE_KINDS.has(kind)
      expect(hasGroups).toBe(expected)
    }
  })

  test("humanOrganismDomain_identifiableKinds_haveIdentifiabilityGroup", () => {
    for (const kind of IDENTIFIABLE_KINDS) {
      const def = getRowFormDef(kind, "human", true)
      const idGroup = def.groups.find((g) => g.id === "identifiability")
      expect(idGroup).toBeDefined()
      expect(idGroup!.kind).toBe("check")
      expect(idGroup!.options).toHaveLength(1)
    }
  })

  test("nonHumanOrganismDomain_identifiableKinds_doNotHaveIdentifiabilityGroup", () => {
    for (const kind of IDENTIFIABLE_KINDS) {
      const def = getRowFormDef(kind, null, true)
      const idGroup = def.groups.find((g) => g.id === "identifiability")
      expect(idGroup).toBeUndefined()
    }
  })

  test("identifiabilityGroupOption_flipsWithHasIdentifier", () => {
    for (const kind of IDENTIFIABLE_KINDS) {
      const onYes = getRowFormDef(kind, "human", true).groups.find((g) => g.id === "identifiability")
      const onNo = getRowFormDef(kind, "human", false).groups.find((g) => g.id === "identifiability")
      expect(onYes!.options[0]!.value).toBe("non-identifiable")
      expect(onNo!.options[0]!.value).toBe("identifiable")
      expect(onYes!.options[0]!.effect.chipAdd?.value).toBe("non-identifiable")
      expect(onNo!.options[0]!.effect.chipAdd?.value).toBe("identifiable")
    }
  })

  test("hasRowDetail_matchesPresenceOfGroups_forAllOrganismDomain", () => {
    for (const organismDomain of ALL_OrganismDomainS) {
      for (const kind of ALL_KINDS) {
        expect(hasRowDetail(kind, organismDomain)).toBe(getRowFormDef(kind, organismDomain, true).groups.length > 0)
      }
    }
  })

  test("everyGroup_hasNonEmptyOptions", () => {
    const empty: string[] = []
    for (const organismDomain of ALL_OrganismDomainS) {
      for (const kind of ALL_KINDS) {
        for (const group of getRowFormDef(kind, organismDomain, true).groups) {
          if (group.options.length === 0) {
            empty.push(`${kind}/${group.id}(organismDomain=${organismDomain})`)
          }
        }
      }
    }
    expect(empty).toStrictEqual([])
  })
})

describe("getRowFormDef_effectVocabulary", () => {
  test("everyEffectGroupType_isValidGroupType", () => {
    const invalid: string[] = []
    for (const { kind, groupId, value, effect } of allEffects("human")) {
      if (effect.groupType === undefined) continue
      if (!GroupType.safeParse(effect.groupType).success) {
        invalid.push(`${kind}/${groupId}/${value}=${effect.groupType}`)
      }
    }
    expect(invalid).toStrictEqual([])
  })

  test("everyEffectDataForm_isValidDataForm", () => {
    const invalid: string[] = []
    for (const { kind, groupId, value, effect } of allEffects("human")) {
      if (effect.dataForm === undefined) continue
      if (!DataForm.safeParse(effect.dataForm).success) {
        invalid.push(`${kind}/${groupId}/${value}=${effect.dataForm}`)
      }
    }
    expect(invalid).toStrictEqual([])
  })

  test("everyChipRemoveAxis_isValidChipAxis", () => {
    const invalid: string[] = []
    for (const { kind, groupId, value, effect } of allEffects("human")) {
      if (effect.chipRemoveAxis === undefined) continue
      if (!ChipAxis.safeParse(effect.chipRemoveAxis).success) {
        invalid.push(`${kind}/${groupId}/${value}=${effect.chipRemoveAxis}`)
      }
    }
    expect(invalid).toStrictEqual([])
  })
})

describe("getRowFormDef_chipAddConsistency", () => {
  test("everyChipAddAxis_isValidChipAxis", () => {
    const invalid: string[] = []
    for (const { kind, groupId, value, effect } of allEffects("human")) {
      if (effect.chipAdd === undefined) continue
      if (!ChipAxis.safeParse(effect.chipAdd.axis).success) {
        invalid.push(`${kind}/${groupId}/${value}=${effect.chipAdd.axis}`)
      }
    }
    expect(invalid).toStrictEqual([])
  })

  test("everyChipAddValue_isAllowedForItsAxis", () => {
    const invalid: string[] = []
    for (const { kind, groupId, value, effect } of allEffects("human")) {
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

  test("chipAdd_rejectsValueFromWrongAxis", () => {
    const spatial = getRowFormDef("spatial-transcriptomics", null, true).groups
      .flatMap((g) => g.options)
      .map((o) => o.effect.chipAdd)
      .find((c): c is NonNullable<FormOptionEffect["chipAdd"]> => c !== undefined)
    expect(spatial).toBeDefined()
    expect(isAllowedChipValue(spatial!.axis, spatial!.value)).toBe(true)
    expect(isAllowedChipValue("tpa", spatial!.value)).toBe(false)
  })

  test("identifiabilityChipAdd_isAllowedForBothHasIdentifierValues", () => {
    const invalid: string[] = []
    for (const hasIdentifier of [true, false]) {
      for (const { kind, groupId, value, effect } of allEffects("human", hasIdentifier)) {
        if (effect.chipAdd === undefined) continue
        if (effect.chipAdd.axis !== "identifiability") continue
        if (!isAllowedChipValue(effect.chipAdd.axis, effect.chipAdd.value)) {
          invalid.push(
            `hasIdentifier=${hasIdentifier} ${kind}/${groupId}/${value}: ${effect.chipAdd.axis}=${effect.chipAdd.value}`,
          )
        }
      }
    }
    expect(invalid).toStrictEqual([])
  })
})
