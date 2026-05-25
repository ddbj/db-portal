import { fc } from "@fast-check/vitest"

import {
  Access,
  ALLOWED_CHIP_VALUES,
  ButtonType,
  type ChipAxis,
  DataForm,
  type FileEntry,
  type FileGroup,
  GroupType,
  Organism,
  type Submission,
} from "../../../app/schemas/submit"

export const arbButtonType = fc.constantFrom(...ButtonType.options)
const arbGroupType = fc.constantFrom(...GroupType.options)
const arbOrganism = fc.constantFrom(...Organism.options)
const arbAccess = fc.constantFrom(...Access.options)
const arbDataForm = fc.constantFrom(...DataForm.options)

const allowedChipPairs: readonly { axis: ChipAxis; value: string }[] = Object.entries(
  ALLOWED_CHIP_VALUES,
).flatMap(([axis, values]) =>
  values.map((value) => ({ axis: axis as ChipAxis, value })),
)

const arbChipTag = fc.constantFrom(...allowedChipPairs)

type EntryShape = {
  buttonType: typeof ButtonType._type
  filename: string
  organism: typeof Organism._type
  access: typeof Access._type
  dataForm: typeof DataForm._type
  groupIdx: number
  chipTags: { axis: typeof ChipAxis._type; value: string }[]
}

type SubmissionShape = {
  groupTypes: (typeof GroupType._type)[]
  entries: EntryShape[]
}

const arbSubmissionShape: fc.Arbitrary<SubmissionShape> = fc.record({
  groupTypes: fc.array(arbGroupType, { minLength: 0, maxLength: 5 }),
  entries: fc.array(
    fc.record({
      buttonType: arbButtonType,
      filename: fc.string({ minLength: 0, maxLength: 24 }),
      organism: arbOrganism,
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
  ({ groupTypes: gts, entries }): Submission => {
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
        buttonType: e.buttonType,
        filename: e.filename,
        organism: e.organism,
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

    return { fileEntries, fileGroups, notes: "" }
  },
)
