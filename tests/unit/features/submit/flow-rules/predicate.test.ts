import { describe, expect, test } from "vitest"

import {
  evalWhen,
  type PredicateContext,
} from "../../../../../app/features/submit/flow-rules/predicate"
import type {
  FileEntry,
  FileEntryChip,
  FileGroup,
  When,
} from "../../../../../app/schemas/submit"

const mkEntry = (over: Partial<FileEntry> = {}): FileEntry => ({
  id: "e1",
  fileTypeKind: "sequence-read",
  filename: "read_0001.fastq",
  access: "open",
  dataForm: "raw",
  groupId: "g1",
  chipTags: [],
  ...over,
})

const mkGroup = (over: Partial<FileGroup> = {}): FileGroup => ({
  id: "g1",
  groupType: "single",
  memberFileIds: [],
  linkedGroupIds: [],
  ...over,
})

const mkCtx = (over: Partial<PredicateContext> = {}): PredicateContext => ({
  entry: mkEntry(),
  group: mkGroup(),
  q1: "public",
  q2: "human",
  ...over,
})

describe("evalWhen atoms", () => {
  test("evalWhen_fileTypeKindMatch_true", () => {
    const ctx = mkCtx({ entry: mkEntry({ fileTypeKind: "variant" }) })
    expect(evalWhen({ fileTypeKind: "variant" }, ctx)).toBe(true)
  })

  test("evalWhen_fileTypeKindMismatch_false", () => {
    const ctx = mkCtx({ entry: mkEntry({ fileTypeKind: "variant" }) })
    expect(evalWhen({ fileTypeKind: "sequence-read" }, ctx)).toBe(false)
  })

  test("evalWhen_fileTypeKindInIncludesEntryKind_true", () => {
    const ctx = mkCtx({ entry: mkEntry({ fileTypeKind: "nmr" }) })
    expect(evalWhen({ fileTypeKindIn: ["mass-spectrometry", "nmr"] }, ctx)).toBe(true)
  })

  test("evalWhen_fileTypeKindInExcludesEntryKind_false", () => {
    const ctx = mkCtx({ entry: mkEntry({ fileTypeKind: "sequence-read" }) })
    expect(evalWhen({ fileTypeKindIn: ["mass-spectrometry", "nmr"] }, ctx)).toBe(false)
  })

  test("evalWhen_accessMatch_true", () => {
    const ctx = mkCtx({ entry: mkEntry({ access: "restricted" }) })
    expect(evalWhen({ access: "restricted" }, ctx)).toBe(true)
  })

  test("evalWhen_accessMismatch_false", () => {
    const ctx = mkCtx({ entry: mkEntry({ access: "open" }) })
    expect(evalWhen({ access: "restricted" }, ctx)).toBe(false)
  })

  test("evalWhen_dataFormMatch_true", () => {
    const ctx = mkCtx({ entry: mkEntry({ dataForm: "assembled" }) })
    expect(evalWhen({ dataForm: "assembled" }, ctx)).toBe(true)
  })

  test("evalWhen_dataFormMismatch_false", () => {
    const ctx = mkCtx({ entry: mkEntry({ dataForm: "raw" }) })
    expect(evalWhen({ dataForm: "assembled" }, ctx)).toBe(false)
  })

  test("evalWhen_groupTypeMatch_true", () => {
    const ctx = mkCtx({ group: mkGroup({ groupType: "pair-end" }) })
    expect(evalWhen({ groupType: "pair-end" }, ctx)).toBe(true)
  })

  test("evalWhen_groupTypeMismatch_false", () => {
    const ctx = mkCtx({ group: mkGroup({ groupType: "single" }) })
    expect(evalWhen({ groupType: "pair-end" }, ctx)).toBe(false)
  })

  test("evalWhen_groupTypeWhenGroupUndefined_false", () => {
    const ctx = mkCtx({ group: undefined })
    expect(evalWhen({ groupType: "single" }, ctx)).toBe(false)
  })

  test("evalWhen_groupTypeInIncludesGroupType_true", () => {
    const ctx = mkCtx({ group: mkGroup({ groupType: "mag-sag-chain" }) })
    expect(evalWhen({ groupTypeIn: ["mag-sag-chain", "assembly-annotation"] }, ctx)).toBe(true)
  })

  test("evalWhen_groupTypeInExcludesGroupType_false", () => {
    const ctx = mkCtx({ group: mkGroup({ groupType: "single" }) })
    expect(evalWhen({ groupTypeIn: ["mag-sag-chain", "assembly-annotation"] }, ctx)).toBe(false)
  })

  test("evalWhen_groupTypeInWhenGroupUndefined_false", () => {
    const ctx = mkCtx({ group: undefined })
    expect(evalWhen({ groupTypeIn: ["single", "pair-end"] }, ctx)).toBe(false)
  })

  test("evalWhen_q1Match_true", () => {
    const ctx = mkCtx({ q1: "third-party" })
    expect(evalWhen({ q1: "third-party" }, ctx)).toBe(true)
  })

  test("evalWhen_q1Mismatch_false", () => {
    const ctx = mkCtx({ q1: "public" })
    expect(evalWhen({ q1: "third-party" }, ctx)).toBe(false)
  })

  test("evalWhen_q1InIncludesQ1_true", () => {
    const ctx = mkCtx({ q1: "restricted" })
    expect(evalWhen({ q1In: ["restricted", "third-party"] }, ctx)).toBe(true)
  })

  test("evalWhen_q1InExcludesQ1_false", () => {
    const ctx = mkCtx({ q1: "public" })
    expect(evalWhen({ q1In: ["restricted", "third-party"] }, ctx)).toBe(false)
  })

  test("evalWhen_q2Match_true", () => {
    const ctx = mkCtx({ q2: "metagenome" })
    expect(evalWhen({ q2: "metagenome" }, ctx)).toBe(true)
  })

  test("evalWhen_q2Mismatch_false", () => {
    const ctx = mkCtx({ q2: "human" })
    expect(evalWhen({ q2: "metagenome" }, ctx)).toBe(false)
  })

  test("evalWhen_q2InIncludesQ2_true", () => {
    const ctx = mkCtx({ q2: "human" })
    expect(evalWhen({ q2In: ["human", "metagenome"] }, ctx)).toBe(true)
  })

  test("evalWhen_q2InExcludesQ2_false", () => {
    const ctx = mkCtx({ q2: "eukaryote" })
    expect(evalWhen({ q2In: ["human", "metagenome"] }, ctx)).toBe(false)
  })
})

describe("evalWhen anyChip", () => {
  const chips: FileEntryChip[] = [
    { axis: "assembly-form", value: "mag" },
    { axis: "provenance", value: "third-party" },
  ]

  test("evalWhen_anyChipAxisAndValueMatch_true", () => {
    const ctx = mkCtx({ entry: mkEntry({ chipTags: chips }) })
    expect(evalWhen({ anyChip: { axis: "assembly-form", value: "mag" } }, ctx)).toBe(true)
  })

  test("evalWhen_anyChipAxisMatchValueMismatch_false", () => {
    const ctx = mkCtx({ entry: mkEntry({ chipTags: chips }) })
    expect(evalWhen({ anyChip: { axis: "assembly-form", value: "sag" } }, ctx)).toBe(false)
  })

  test("evalWhen_anyChipAxisOnlyWithMatchingAxis_true", () => {
    const ctx = mkCtx({ entry: mkEntry({ chipTags: chips }) })
    expect(evalWhen({ anyChip: { axis: "provenance" } }, ctx)).toBe(true)
  })

  test("evalWhen_anyChipAxisOnlyWithNoMatchingAxis_false", () => {
    const ctx = mkCtx({ entry: mkEntry({ chipTags: chips }) })
    expect(evalWhen({ anyChip: { axis: "mass-spec-domain" } }, ctx)).toBe(false)
  })

  test("evalWhen_anyChipValueMatchesWrongAxis_false", () => {
    // value "third-party" exists, but only on the provenance axis, not mass-spec-domain
    const ctx = mkCtx({ entry: mkEntry({ chipTags: chips }) })
    expect(evalWhen({ anyChip: { axis: "mass-spec-domain", value: "third-party" } }, ctx)).toBe(false)
  })

  test("evalWhen_anyChipOnEmptyChipTags_false", () => {
    const ctx = mkCtx({ entry: mkEntry({ chipTags: [] }) })
    expect(evalWhen({ anyChip: { axis: "assembly-form", value: "mag" } }, ctx)).toBe(false)
  })

  test("evalWhen_anyChipAxisOnlyOnEmptyChipTags_false", () => {
    const ctx = mkCtx({ entry: mkEntry({ chipTags: [] }) })
    expect(evalWhen({ anyChip: { axis: "assembly-form" } }, ctx)).toBe(false)
  })

  test("evalWhen_anyChipMatchesAmongMultipleChips_true", () => {
    const many: FileEntryChip[] = [
      { axis: "assembly-form", value: "raw" },
      { axis: "assembly-form", value: "sag" },
      { axis: "spatial-platform", value: "visium" },
    ]
    const ctx = mkCtx({ entry: mkEntry({ chipTags: many }) })
    expect(evalWhen({ anyChip: { axis: "assembly-form", value: "sag" } }, ctx)).toBe(true)
  })
})

describe("evalWhen null preconditions", () => {
  test("evalWhen_q1WhenNull_false", () => {
    const ctx = mkCtx({ q1: null })
    expect(evalWhen({ q1: "public" }, ctx)).toBe(false)
  })

  test("evalWhen_q1InWhenNull_false", () => {
    const ctx = mkCtx({ q1: null })
    expect(evalWhen({ q1In: ["public", "restricted", "third-party"] }, ctx)).toBe(false)
  })

  test("evalWhen_q2WhenNull_false", () => {
    const ctx = mkCtx({ q2: null })
    expect(evalWhen({ q2: "human" }, ctx)).toBe(false)
  })

  test("evalWhen_q2InWhenNull_false", () => {
    const ctx = mkCtx({ q2: null })
    expect(
      evalWhen({ q2In: ["human", "eukaryote", "prokaryote", "virus", "metagenome"] }, ctx),
    ).toBe(false)
  })

  test("evalWhen_q1NullDoesNotAffectQ2Predicate_true", () => {
    const ctx = mkCtx({ q1: null, q2: "human" })
    expect(evalWhen({ q2: "human" }, ctx)).toBe(true)
  })

  test("evalWhen_q2NullDoesNotAffectQ1Predicate_true", () => {
    const ctx = mkCtx({ q1: "public", q2: null })
    expect(evalWhen({ q1: "public" }, ctx)).toBe(true)
  })
})

describe("evalWhen combinators", () => {
  test("evalWhen_alwaysTrue_true", () => {
    expect(evalWhen({ always: true }, mkCtx())).toBe(true)
  })

  test("evalWhen_andAllTrue_true", () => {
    const ctx = mkCtx({ entry: mkEntry({ access: "restricted" }), q2: "human" })
    expect(evalWhen({ and: [{ access: "restricted" }, { q2In: ["human", "metagenome"] }] }, ctx)).toBe(
      true,
    )
  })

  test("evalWhen_andOneFalse_false", () => {
    const ctx = mkCtx({ entry: mkEntry({ access: "open" }), q2: "human" })
    expect(evalWhen({ and: [{ access: "restricted" }, { q2In: ["human", "metagenome"] }] }, ctx)).toBe(
      false,
    )
  })

  test("evalWhen_andEmpty_true", () => {
    expect(evalWhen({ and: [] }, mkCtx())).toBe(true)
  })

  test("evalWhen_orOneTrue_true", () => {
    const ctx = mkCtx({ q1: "third-party", entry: mkEntry({ chipTags: [] }) })
    expect(
      evalWhen({ or: [{ q1: "third-party" }, { anyChip: { axis: "provenance", value: "third-party" } }] }, ctx),
    ).toBe(true)
  })

  test("evalWhen_orAllFalse_false", () => {
    const ctx = mkCtx({ q1: "public", entry: mkEntry({ chipTags: [] }) })
    expect(
      evalWhen({ or: [{ q1: "third-party" }, { anyChip: { axis: "provenance", value: "third-party" } }] }, ctx),
    ).toBe(false)
  })

  test("evalWhen_orSecondTrueFirstFalse_true", () => {
    const ctx = mkCtx({
      q1: "public",
      entry: mkEntry({ chipTags: [{ axis: "provenance", value: "third-party" }] }),
    })
    expect(
      evalWhen({ or: [{ q1: "third-party" }, { anyChip: { axis: "provenance", value: "third-party" } }] }, ctx),
    ).toBe(true)
  })

  test("evalWhen_orEmpty_false", () => {
    expect(evalWhen({ or: [] }, mkCtx())).toBe(false)
  })

  test("evalWhen_notOfTrue_false", () => {
    const ctx = mkCtx({ entry: mkEntry({ access: "restricted" }) })
    expect(evalWhen({ not: { access: "restricted" } }, ctx)).toBe(false)
  })

  test("evalWhen_notOfFalse_true", () => {
    const ctx = mkCtx({ entry: mkEntry({ access: "open" }) })
    expect(evalWhen({ not: { access: "restricted" } }, ctx)).toBe(true)
  })

  test("evalWhen_doubleNot_isIdentity", () => {
    const ctx = mkCtx({ entry: mkEntry({ access: "restricted" }) })
    const inner: When = { access: "restricted" }
    expect(evalWhen({ not: { not: inner } }, ctx)).toBe(evalWhen(inner, ctx))
  })

  test("evalWhen_nestedAndOrNot_evaluatesAtThreeLevels", () => {
    // not( and( or(q1=third-party, access=restricted), q2In[human,metagenome] ) )
    const when: When = {
      not: {
        and: [
          { or: [{ q1: "third-party" }, { access: "restricted" }] },
          { q2In: ["human", "metagenome"] },
        ],
      },
    }
    const inner = mkCtx({ q1: "third-party", entry: mkEntry({ access: "open" }), q2: "human" })
    expect(evalWhen(when, inner)).toBe(false)

    const outer = mkCtx({ q1: "public", entry: mkEntry({ access: "open" }), q2: "human" })
    expect(evalWhen(when, outer)).toBe(true)
  })
})

describe("evalWhen unknown shape", () => {
  test("evalWhen_unrecognizedKey_false", () => {
    // an object with no known discriminant key falls through to the default false
    expect(evalWhen({} as unknown as When, mkCtx())).toBe(false)
  })
})

describe("evalWhen does not read across context", () => {
  test("evalWhen_q1Predicate_ignoresEntryAndGroup", () => {
    const a = mkCtx({ q1: "restricted", entry: mkEntry({ access: "open" }), group: undefined })
    const b = mkCtx({
      q1: "restricted",
      entry: mkEntry({ access: "restricted", fileTypeKind: "variant" }),
      group: mkGroup({ groupType: "jga-dataset" }),
    })
    const when: When = { q1: "restricted" }
    expect(evalWhen(when, a)).toBe(true)
    expect(evalWhen(when, b)).toBe(true)
  })

  test("evalWhen_accessPredicate_ignoresQ1Q2AndGroup", () => {
    const when: When = { access: "restricted" }
    const a = mkCtx({ q1: null, q2: null, group: undefined, entry: mkEntry({ access: "restricted" }) })
    const b = mkCtx({ q1: "public", q2: "virus", entry: mkEntry({ access: "restricted" }) })
    expect(evalWhen(when, a)).toBe(true)
    expect(evalWhen(when, b)).toBe(true)
  })
})
