import { describe, expect, test } from "vitest"

import { applyRadio, initDraft, optionMatches, toggleCheck } from "../../../../../app/features/submit/detail/form-apply"
import type { FormOptionDef } from "../../../../../app/features/submit/detail/form-defs"
import { getRowFormDef } from "../../../../../app/features/submit/detail/form-defs"
import type { FileTypeKind, OrganismDomain } from "../../../../../app/schemas/submit"
import { FileEntry, type FileEntryChip, type FileGroup } from "../../../../../app/schemas/submit"

const groupDef = (kind: FileTypeKind, organismDomain: OrganismDomain | null, id: string) => {
  const group = getRowFormDef(kind, organismDomain, true).groups.find((g) => g.id === id)
  if (group === undefined) throw new Error(`group ${id} is missing from ${kind}`)

  return group
}

const optionDef = (
  kind: FileTypeKind,
  organismDomain: OrganismDomain | null,
  groupId: string,
  value: string,
): FormOptionDef => {
  const option = groupDef(kind, organismDomain, groupId).options.find((o) => o.value === value)
  if (option === undefined) throw new Error(`option ${value} is missing from ${kind}/${groupId}`)

  return option
}

const platformOption = (value: string): FormOptionDef =>
  optionDef("spatial-transcriptomics", null, "platform", value)

const GROUP: FileGroup = { id: "g1", groupType: "single", memberFileIds: ["e1"], linkedGroupIds: [] }

const spatialEntry = (chipTags: FileEntryChip[]): FileEntry => ({
  id: "e1",
  fileTypeKind: "spatial-transcriptomics",
  access: "open",
  dataForm: "matrix",
  groupId: "g1",
  chipTags,
})

const platformsOf = (chipTags: readonly FileEntryChip[]): string[] =>
  chipTags.filter((c) => c.axis === "spatial-platform").map((c) => c.value)

describe("toggleCheck on a multi-value axis", () => {
  test("toggleCheck_multiValueAxisSecondValue_keepsBothChips", () => {
    const draft = initDraft(spatialEntry([{ axis: "spatial-platform", value: "visium" }]), GROUP)

    const next = toggleCheck(draft, platformOption("xenium"), false)

    expect(platformsOf(next.chipTags)).toEqual(["visium", "xenium"])
  })

  test("toggleCheck_multiValueAxisAlreadyChecked_removesOnlyThatValue", () => {
    const draft = initDraft(
      spatialEntry([
        { axis: "spatial-platform", value: "visium" },
        { axis: "spatial-platform", value: "xenium" },
      ]),
      GROUP,
    )

    const next = toggleCheck(draft, platformOption("visium"), true)

    expect(platformsOf(next.chipTags)).toEqual(["xenium"])
  })

  test("toggleCheck_multiValueAxisEveryPlatform_keepsAllAndStaysSchemaValid", () => {
    let draft = initDraft(spatialEntry([]), GROUP)
    for (const value of ["visium", "xenium", "merfish", "stereo-seq"]) {
      draft = toggleCheck(draft, platformOption(value), false)
    }

    expect(platformsOf(draft.chipTags)).toEqual(["visium", "xenium", "merfish", "stereo-seq"])
    expect(FileEntry.safeParse(spatialEntry(draft.chipTags)).success).toBe(true)
  })

  test("toggleCheck_multiValueAxisLastValueUnchecked_leavesTheAxisEmpty", () => {
    const draft = initDraft(spatialEntry([{ axis: "spatial-platform", value: "xenium" }]), GROUP)

    const next = toggleCheck(draft, platformOption("xenium"), true)

    expect(platformsOf(next.chipTags)).toEqual([])
  })

  test("toggleCheck_multiValueAxis_leavesChipsOnOtherAxesUntouched", () => {
    const draft = initDraft(
      spatialEntry([
        { axis: "identifiability", value: "identifiable" },
        { axis: "spatial-platform", value: "visium" },
      ]),
      GROUP,
    )

    const next = toggleCheck(draft, platformOption("xenium"), false)

    expect(next.chipTags).toContainEqual({ axis: "identifiability", value: "identifiable" })
  })

  test("optionMatches_multiValueAxisTwoSelected_matchesEachSelectedValueOnly", () => {
    const draft = initDraft(
      spatialEntry([
        { axis: "spatial-platform", value: "visium" },
        { axis: "spatial-platform", value: "merfish" },
      ]),
      GROUP,
    )

    expect(optionMatches(platformOption("visium"), draft)).toBe(true)
    expect(optionMatches(platformOption("merfish"), draft)).toBe(true)
    expect(optionMatches(platformOption("xenium"), draft)).toBe(false)
  })
})

describe("toggleCheck on a single-value axis", () => {
  test("toggleCheck_singleValueAxisHoldingTheOppositeValue_replacesIt", () => {
    const entry: FileEntry = {
      id: "e1",
      fileTypeKind: "sequence-read",
      access: "restricted",
      dataForm: "raw",
      groupId: "g1",
      chipTags: [{ axis: "identifiability", value: "identifiable" }],
    }
    const option = optionDef("sequence-read", "human", "identifiability", "non-identifiable")

    const next = toggleCheck(initDraft(entry, GROUP), option, false)

    expect(next.chipTags).toEqual([{ axis: "identifiability", value: "non-identifiable" }])
  })
})

describe("applyRadio", () => {
  test("applyRadio_singleValueAxis_replacesThePreviousSelection", () => {
    const entry: FileEntry = {
      id: "e1",
      fileTypeKind: "sequence",
      access: "open",
      dataForm: "assembled",
      groupId: "g1",
      chipTags: [{ axis: "assembly-form", value: "genome" }],
    }
    const options = groupDef("sequence", null, "assembly-form").options

    const next = applyRadio(initDraft(entry, GROUP), optionDef("sequence", null, "assembly-form", "mag-chain"), options)

    expect(next.chipTags.filter((c) => c.axis === "assembly-form")).toEqual([
      { axis: "assembly-form", value: "mag" },
    ])
  })
})
