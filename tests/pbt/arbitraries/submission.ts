import { fc } from "@fast-check/vitest"

import {
  Access,
  ALLOWED_CHIP_VALUES,
  type ChipAxis,
  DataForm,
  type FileEntry,
  type FileGroup,
  FileTypeKind,
  GroupType,
  Q1,
  Q2,
  type Submission,
} from "../../../app/schemas/submit"

export const arbFileTypeKind = fc.constantFrom(...FileTypeKind.options)
export const arbQ1 = fc.constantFrom(...Q1.options)
export const arbQ2 = fc.constantFrom(...Q2.options)
const arbGroupType = fc.constantFrom(...GroupType.options)
export const arbAccess = fc.constantFrom(...Access.options)
const arbDataForm = fc.constantFrom(...DataForm.options)
const arbQ1OrNull = fc.option(arbQ1, { nil: null })
const arbQ2OrNull = fc.option(arbQ2, { nil: null })

const allowedChipPairs: readonly { axis: ChipAxis; value: string }[] = Object.entries(
  ALLOWED_CHIP_VALUES,
).flatMap(([axis, values]) =>
  values.map((value) => ({ axis: axis as ChipAxis, value })),
)

const arbChipTag = fc.constantFrom(...allowedChipPairs)

type EntryShape = {
  fileTypeKind: typeof FileTypeKind._type
  filename: string
  access: typeof Access._type
  dataForm: typeof DataForm._type
  groupIdx: number
  chipTags: { axis: typeof ChipAxis._type; value: string }[]
}

type SubmissionShape = {
  q1: typeof Q1._type | null
  q2: typeof Q2._type | null
  groupTypes: (typeof GroupType._type)[]
  entries: EntryShape[]
}

const arbSubmissionShape: fc.Arbitrary<SubmissionShape> = fc.record({
  q1: arbQ1OrNull,
  q2: arbQ2OrNull,
  groupTypes: fc.array(arbGroupType, { minLength: 0, maxLength: 5 }),
  entries: fc.array(
    fc.record({
      fileTypeKind: arbFileTypeKind,
      filename: fc.string({ minLength: 0, maxLength: 24 }),
      access: arbAccess,
      dataForm: arbDataForm,
      groupIdx: fc.integer({ min: 0, max: 6 }),
      chipTags: fc.array(arbChipTag, { minLength: 0, maxLength: 3 }),
    }),
    { minLength: 0, maxLength: 10 },
  ),
})

const groupIdOf = (i: number): string => `g${i}`
const entryIdOf = (i: number): string => `e${i}`
const ORPHAN_GROUP_ID = "g-orphan"

export const arbSubmission: fc.Arbitrary<Submission> = arbSubmissionShape.map(
  ({ q1, q2, groupTypes: gts, entries }): Submission => {
    const fileGroups: FileGroup[] = gts.map((gt, i) => ({
      id: groupIdOf(i),
      groupType: gt,
      memberFileIds: [],
      linkedGroupIds: [],
    }))

    const fileEntries: FileEntry[] = entries.map((e, i) => {
      const groupId = fileGroups.length === 0
        ? ORPHAN_GROUP_ID
        : fileGroups[e.groupIdx % fileGroups.length]!.id

      return {
        id: entryIdOf(i),
        fileTypeKind: e.fileTypeKind,
        filename: e.filename,
        access: e.access,
        dataForm: e.dataForm,
        groupId,
        chipTags: e.chipTags,
      }
    })

    const byGroup = new Map<string, string[]>()
    for (const e of fileEntries) {
      const arr = byGroup.get(e.groupId) ?? []
      arr.push(e.id)
      byGroup.set(e.groupId, arr)
    }
    for (const g of fileGroups) {
      g.memberFileIds = byGroup.get(g.id) ?? []
    }

    return { preconditions: { q1, q2 }, fileEntries, fileGroups, notes: "" }
  },
)
