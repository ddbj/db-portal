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
  OrganismDomain,
  type Submission,
} from "../../../app/schemas/submit"
import type { AccessSection } from "../../../app/schemas/submit/submission"

export const arbFileTypeKind = fc.constantFrom(...FileTypeKind.options)
export const arbOrganismDomain = fc.constantFrom(...OrganismDomain.options)
const arbGroupType = fc.constantFrom(...GroupType.options)
export const arbAccess = fc.constantFrom(...Access.options)
const arbDataForm = fc.constantFrom(...DataForm.options)
const arbOrganismDomainOrNull = fc.option(arbOrganismDomain, { nil: null })

export const arbAccessSection: fc.Arbitrary<AccessSection> = fc.oneof(
  fc.constant({ restrictedPreference: true, hasIdentifier: false, ethicsCompliance: false, publiclyAvailable: false, microbialAnalysis: false }),
  fc.constant({ restrictedPreference: false, hasIdentifier: true, ethicsCompliance: false, publiclyAvailable: false, microbialAnalysis: false }),
  fc.constant({ restrictedPreference: false, hasIdentifier: false, ethicsCompliance: true, publiclyAvailable: false, microbialAnalysis: false }),
  fc.constant({ restrictedPreference: false, hasIdentifier: false, ethicsCompliance: false, publiclyAvailable: true, microbialAnalysis: false }),
  fc.constant({ restrictedPreference: false, hasIdentifier: false, ethicsCompliance: false, publiclyAvailable: false, microbialAnalysis: true }),
  fc.constant({ restrictedPreference: false, hasIdentifier: false, ethicsCompliance: false, publiclyAvailable: false, microbialAnalysis: false }),
)

const allowedChipPairs: readonly { axis: ChipAxis; value: string }[] = Object.entries(
  ALLOWED_CHIP_VALUES,
).flatMap(([axis, values]) =>
  values.map((value) => ({ axis: axis as ChipAxis, value })),
)

const arbChipTag = fc.constantFrom(...allowedChipPairs)

type EntryShape = {
  fileTypeKind: typeof FileTypeKind._type
  access: typeof Access._type
  dataForm: typeof DataForm._type
  groupIdx: number
  chipTags: { axis: typeof ChipAxis._type; value: string }[]
}

type SubmissionShape = {
  organismDomain: typeof OrganismDomain._type | null
  accessSection: AccessSection
  groupTypes: (typeof GroupType._type)[]
  entries: EntryShape[]
}

const arbSubmissionShape: fc.Arbitrary<SubmissionShape> = fc.record({
  organismDomain: arbOrganismDomainOrNull,
  accessSection: arbAccessSection,
  groupTypes: fc.array(arbGroupType, { minLength: 0, maxLength: 5 }),
  entries: fc.array(
    fc.record({
      fileTypeKind: arbFileTypeKind,
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
  ({ organismDomain, accessSection, groupTypes: gts, entries }): Submission => {
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

    return { preconditions: { organismDomain }, accessSection, fileEntries, fileGroups, notes: "" }
  },
)
